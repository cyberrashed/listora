import { describe, expect, it } from "vitest";
import { hashPassword } from "../auth/password";
import { withTestDatabase } from "../testing";
import { listCustomers, setCustomerStatus } from "../users/users";
import type { Permission } from "./permissions";
import { findActor, signIn } from "./staff-auth";
import { Role, Staff } from "./staff.model";
import {
  createStaff,
  deleteRole,
  listStaff,
  setStaffActive,
  updateRolePermissions,
} from "./team";

withTestDatabase();

const PASSWORD = "a long enough password";

async function staffWithRole(
  email: string,
  role: { name: string; owner?: boolean; permissions?: Permission[] },
) {
  const { _id: roleId } = await Role.create(role);
  await Staff.create({
    name: email.split("@")[0],
    email,
    passwordHash: await hashPassword(PASSWORD),
    roleId,
  });
  const { token } = await signIn({ email, password: PASSWORD });
  return { actor: (await findActor(token))!, token, roleId: String(roleId) };
}

const owner = () =>
  staffWithRole("priya@listora.test", { name: "Owner", owner: true });

const moderator = () =>
  staffWithRole("marcus@listora.test", {
    name: "Moderator",
    permissions: ["customers.view"],
  });

describe("permissions", () => {
  it("lets an owner do everything without listing permissions", async () => {
    const { actor } = await owner();

    await expect(listStaff(actor)).resolves.toHaveLength(1);
    await expect(listCustomers(actor, {})).resolves.toMatchObject({ total: 0 });
  });

  it("refuses a role that lacks the permission", async () => {
    const { actor, roleId } = await moderator();

    await expect(listStaff(actor)).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      createStaff(actor, {
        name: "Someone New",
        email: "new@listora.test",
        password: PASSWORD,
        roleId,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      setCustomerStatus(actor, "000000000000000000000000", "suspended"),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("allows what the role does include", async () => {
    const { actor } = await moderator();

    await expect(listCustomers(actor, {})).resolves.toMatchObject({ total: 0 });
  });
});

describe("staff accounts", () => {
  it("signs a deactivated member out and keeps them out", async () => {
    const { actor } = await owner();
    const marcus = await moderator();

    await setStaffActive(actor, marcus.actor.id, false);

    expect(await findActor(marcus.token)).toBeNull();
    await expect(
      signIn({ email: marcus.actor.email, password: PASSWORD }),
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("keeps the last owner active", async () => {
    const first = await owner();
    const second = await staffWithRole("omar@listora.test", {
      name: "Second owner",
      owner: true,
    });

    await expect(
      setStaffActive(first.actor, first.actor.id, false),
    ).rejects.toMatchObject({ code: "conflict" });

    await setStaffActive(first.actor, second.actor.id, false);
    await expect(
      setStaffActive(second.actor, first.actor.id, false),
    ).rejects.toMatchObject({ code: "conflict" });
  });
});

describe("roles", () => {
  it("protects the owner role", async () => {
    const { actor, roleId } = await owner();

    await expect(
      updateRolePermissions(actor, roleId, []),
    ).rejects.toMatchObject({ code: "conflict" });
    await expect(deleteRole(actor, roleId)).rejects.toMatchObject({
      code: "conflict",
    });
  });

  it("applies a permission change on the member's next request", async () => {
    const { actor } = await owner();
    const marcus = await moderator();

    await updateRolePermissions(actor, marcus.roleId, []);

    const refreshed = (await findActor(marcus.token))!;
    await expect(listCustomers(refreshed, {})).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("won't remove a role that still has staff", async () => {
    const { actor } = await owner();
    const marcus = await moderator();

    await expect(deleteRole(actor, marcus.roleId)).rejects.toMatchObject({
      code: "conflict",
    });
  });
});
