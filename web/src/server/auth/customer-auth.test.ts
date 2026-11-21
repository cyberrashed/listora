import { describe, expect, it } from "vitest";
import { Email } from "../emails/email.model";
import { withTestDatabase } from "../testing";
import { User } from "../users/user.model";
import {
  authenticate,
  login,
  refresh,
  register,
  requestPasswordReset,
  resetPassword,
} from "./customer-auth";

withTestDatabase();

const dana = {
  name: "Dana Whitfield",
  email: "dana@mailbox.example",
  password: "correct horse battery",
};

async function resetCodeFor(email: string) {
  const message = await Email.findOne({ to: email, kind: "password_reset" })
    .sort({ createdAt: -1 })
    .lean();
  return /\d{6}/.exec(message!.body)![0];
}

describe("registering", () => {
  it("creates the account, signs it in and records a welcome email", async () => {
    const { user, tokens } = await register(dana);

    expect(user).toMatchObject({ name: dana.name, email: dana.email });
    expect((await authenticate(tokens.accessToken)).email).toBe(dana.email);
    expect(
      await Email.countDocuments({ to: dana.email, kind: "welcome" }),
    ).toBe(1);
  });

  it("refuses an email that already has an account", async () => {
    await register(dana);

    await expect(register(dana)).rejects.toMatchObject({
      code: "conflict",
      fields: { email: expect.any(String) },
    });
  });
});

describe("signing in", () => {
  it("accepts the right password", async () => {
    await register(dana);

    const { user } = await login(dana);
    expect(user.email).toBe(dana.email);
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    await register(dana);

    const wrongPassword = await login({
      ...dana,
      password: "not the password",
    }).catch((error: unknown) => error);
    const unknownEmail = await login({
      ...dana,
      email: "nobody@mailbox.example",
    }).catch((error: unknown) => error);

    expect(wrongPassword).toMatchObject({ code: "unauthenticated" });
    expect(unknownEmail).toEqual(wrongPassword);
  });
});

describe("refreshing a session", () => {
  it("rotates the refresh token", async () => {
    const { tokens } = await register(dana);

    const rotated = await refresh(tokens.refreshToken);

    expect(rotated.refreshToken).not.toBe(tokens.refreshToken);
    expect((await authenticate(rotated.accessToken)).email).toBe(dana.email);
  });

  it("ends the session when a used token is replayed", async () => {
    const { tokens } = await register(dana);
    const rotated = await refresh(tokens.refreshToken);

    await expect(refresh(tokens.refreshToken)).rejects.toMatchObject({
      code: "unauthenticated",
    });
    // The replay revoked the session, so the newest token is dead too.
    await expect(refresh(rotated.refreshToken)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("rejects a token it never issued", async () => {
    await expect(refresh("made-up-token")).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });
});

describe("resetting a password", () => {
  it("sets the new password and signs out existing sessions", async () => {
    const { tokens } = await register(dana);
    await requestPasswordReset(dana.email);

    await resetPassword({
      email: dana.email,
      code: await resetCodeFor(dana.email),
      password: "a brand new password",
    });

    await expect(login(dana)).rejects.toMatchObject({
      code: "unauthenticated",
    });
    await expect(refresh(tokens.refreshToken)).rejects.toMatchObject({
      code: "unauthenticated",
    });
    const { user } = await login({ ...dana, password: "a brand new password" });
    expect(user.email).toBe(dana.email);
  });

  it("rejects a wrong code and locks the code after five tries", async () => {
    await register(dana);
    await requestPasswordReset(dana.email);
    const code = await resetCodeFor(dana.email);
    const wrong = code === "000000" ? "111111" : "000000";

    for (let attempt = 0; attempt < 5; attempt++) {
      await expect(
        resetPassword({
          email: dana.email,
          code: wrong,
          password: "whatever123",
        }),
      ).rejects.toMatchObject({ code: "validation" });
    }

    await expect(
      resetPassword({ email: dana.email, code, password: "whatever123" }),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("checks no more than five guesses sent together", async () => {
    await register(dana);
    await requestPasswordReset(dana.email);
    const code = await resetCodeFor(dana.email);
    const wrong = code === "000000" ? "111111" : "000000";

    const guesses = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        resetPassword({
          email: dana.email,
          code: wrong,
          password: "whatever123",
        }),
      ),
    );

    expect(guesses.every((guess) => guess.status === "rejected")).toBe(true);
    const user = await User.findOne({ email: dana.email });
    expect(user?.passwordReset?.attempts).toBe(5);
  });

  it("stays silent for an email with no account", async () => {
    await requestPasswordReset("nobody@mailbox.example");

    expect(await Email.countDocuments()).toBe(0);
  });
});
