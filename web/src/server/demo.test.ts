import { afterEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "./auth/password";
import { getSettings, updateSettings } from "./settings/settings";
import { findActor, signInDemo } from "./staff/staff-auth";
import { Role, Staff } from "./staff/staff.model";
import { createRole, setStaffActive } from "./staff/team";
import { withTestDatabase } from "./testing";

withTestDatabase();

afterEach(() => {
  vi.unstubAllEnvs();
});

async function seedTeam() {
  const [owner, moderator] = await Role.create([
    { name: "Owner", owner: true },
    { name: "Moderator", permissions: ["listings.review"] },
  ]);
  const passwordHash = await hashPassword("a long enough password");
  await Staff.create([
    {
      name: "Priya Raman",
      email: "priya.raman@listora.test",
      passwordHash,
      roleId: owner._id,
    },
    {
      name: "Marcus Bell",
      email: "marcus.bell@listora.test",
      passwordHash,
      roleId: moderator._id,
    },
  ]);
}

async function demoOwner() {
  const { token } = await signInDemo("owner");
  return (await findActor(token))!;
}

describe("the public demo", () => {
  it("is closed unless DEMO_MODE is on", async () => {
    await seedTeam();

    await expect(signInDemo("owner")).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("signs a visitor in to a seeded account without a password", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    await seedTeam();

    const { token } = await signInDemo("moderator");

    expect(await findActor(token)).toMatchObject({
      email: "marcus.bell@listora.test",
      role: "Moderator",
    });
  });

  it("asks the visitor to wait while the reset has removed the accounts", async () => {
    vi.stubEnv("DEMO_MODE", "true");

    await expect(signInDemo("owner")).rejects.toMatchObject({
      code: "conflict",
    });
  });

  it("keeps the team and the settings as seeded", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    await seedTeam();
    const owner = await demoOwner();
    const marcus = await Staff.findOne({ email: "marcus.bell@listora.test" });
    const before = await getSettings();

    await expect(
      createRole(owner, { name: "Intern", permissions: [] }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      setStaffActive(owner, String(marcus!._id), false),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      updateSettings(owner, { ...before, maintenance: true }),
    ).rejects.toMatchObject({ code: "forbidden" });

    expect(await Role.countDocuments()).toBe(2);
    expect((await getSettings()).maintenance).toBe(false);
  });
});
