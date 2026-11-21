import "server-only";
import { connectDb, isObjectId } from "../db";
import { sendEmail } from "../emails/emails";
import { AppError } from "../errors";
import { toUserDto, User, type UserDoc } from "../users/user.model";
import { hashPassword, verifyPassword } from "./password";
import type { Credentials, PasswordReset, Registration } from "./schemas";
import { Session } from "./session.model";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  hashToken,
  randomCode,
  randomToken,
  signAccessToken,
  verifyAccessToken,
} from "./tokens";

const REFRESH_TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000;
const RESET_CODE_TTL_MS = 15 * 60 * 1000;
const RESET_MAX_ATTEMPTS = 5;

const invalidCredentials = () =>
  new AppError("unauthenticated", "That email and password don't match.");

const invalidSession = () =>
  new AppError("unauthenticated", "Your session has ended. Sign in again.");

const invalidResetCode = () =>
  new AppError("validation", "That code is wrong or has expired.", {
    code: "That code is wrong or has expired.",
  });

function refreshExpiry() {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
}

async function issueTokens(userId: string, refreshToken: string) {
  return {
    accessToken: await signAccessToken(userId),
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  };
}

async function startSession(user: UserDoc) {
  const refreshToken = randomToken();
  await Session.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiry(),
  });
  return {
    user: toUserDto(user),
    tokens: await issueTokens(user.id as string, refreshToken),
  };
}

export async function register(input: Registration) {
  await connectDb();

  if (await User.exists({ email: input.email })) {
    throw new AppError("conflict", "That email already has an account.", {
      email: "That email already has an account.",
    });
  }

  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
  });

  await sendEmail({
    to: user.email,
    kind: "welcome",
    subject: "Welcome to Listora",
    body: `Hi ${user.name}, your account is ready. Post your first listing whenever you like.`,
  });

  return startSession(user);
}

export async function login({ email, password }: Credentials) {
  await connectDb();

  const user = await User.findOne({ email });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw invalidCredentials();
  }
  if (user.status === "suspended") {
    throw new AppError("forbidden", "This account has been suspended.");
  }

  return startSession(user);
}

export async function refresh(refreshToken: string) {
  await connectDb();

  const presented = hashToken(refreshToken);
  const next = randomToken();

  const session = await Session.findOneAndUpdate(
    { tokenHash: presented, expiresAt: { $gt: new Date() } },
    {
      tokenHash: hashToken(next),
      previousTokenHash: presented,
      expiresAt: refreshExpiry(),
    },
  );

  if (!session) {
    // A token that was already rotated is being replayed: either the client
    // retried, or the token was copied. End that session either way.
    await Session.deleteOne({ previousTokenHash: presented });
    throw invalidSession();
  }

  return issueTokens(String(session.userId), next);
}

export async function logout(refreshToken: string) {
  await connectDb();
  await Session.deleteOne({ tokenHash: hashToken(refreshToken) });
}

export async function authenticate(accessToken: string) {
  const userId = await verifyAccessToken(accessToken);
  await connectDb();

  const user = isObjectId(userId) ? await User.findById(userId) : null;
  if (!user || user.status !== "active") throw invalidSession();
  return user;
}

export async function requestPasswordReset(email: string) {
  await connectDb();

  // The caller gets the same answer whether or not the account exists.
  const user = await User.findOne({ email });
  if (!user) return;

  const code = randomCode();
  user.passwordReset = {
    codeHash: hashToken(code),
    expiresAt: new Date(Date.now() + RESET_CODE_TTL_MS),
    attempts: 0,
  };
  await user.save();

  await sendEmail({
    to: user.email,
    kind: "password_reset",
    subject: "Your Listora reset code",
    body: `Your reset code is ${code}. It expires in 15 minutes. If you didn't ask for it, you can ignore this email.`,
  });
}

export async function resetPassword(input: PasswordReset) {
  await connectDb();

  const user = await User.findOne({ email: input.email });
  const reset = user?.passwordReset;
  if (
    !user ||
    !reset?.codeHash ||
    !reset.expiresAt ||
    reset.expiresAt < new Date()
  ) {
    throw invalidResetCode();
  }

  // Each guess uses up an attempt before it is checked, so guesses sent
  // together can't get past the limit.
  const counted = await User.updateOne(
    {
      _id: user._id,
      "passwordReset.attempts": { $not: { $gte: RESET_MAX_ATTEMPTS } },
    },
    { $inc: { "passwordReset.attempts": 1 } },
  );
  if (counted.modifiedCount === 0 || reset.codeHash !== hashToken(input.code)) {
    throw invalidResetCode();
  }

  user.passwordHash = await hashPassword(input.password);
  user.passwordReset = undefined;
  await user.save();

  // A reset signs the account out everywhere.
  await Session.deleteMany({ userId: user._id });
}
