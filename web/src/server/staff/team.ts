import "server-only";
import { z } from "zod";
import { hashPassword } from "../auth/password";
import { email, newPassword, personName } from "../auth/schemas";
import { connectDb, isObjectId } from "../db";
import { AppError } from "../errors";
import { type Actor, authorize } from "./authorize";
import { type Permission, permissionKeys } from "./permissions";
import { Role, Staff, StaffSession } from "./staff.model";

export const newStaff = z.object({
  name: personName,
  email,
  password: newPassword,
  roleId: z.string().refine(isObjectId, "Choose a role."),
});

export const roleInput = z.object({
  name: z.string().trim().min(2, "Enter a role name.").max(40),
  permissions: z.array(z.enum(permissionKeys)),
});

const notFound = (what: string) =>
  new AppError("not_found", `That ${what} no longer exists.`);

export async function listStaff(actor: Actor) {
  authorize(actor, "team.manage");
  await connectDb();

  const [staff, roles] = await Promise.all([
    Staff.find().sort({ createdAt: 1 }).lean(),
    Role.find().lean(),
  ]);
  const roleNames = new Map(roles.map((role) => [String(role._id), role.name]));

  return staff.map((member) => ({
    id: String(member._id),
    name: member.name,
    email: member.email,
    role: roleNames.get(String(member.roleId)) ?? "",
    active: member.active,
    joinedAt: member.createdAt,
  }));
}

export async function listRoles(actor: Actor) {
  authorize(actor, "team.manage");
  await connectDb();

  const [roles, counts] = await Promise.all([
    Role.find().sort({ owner: -1, name: 1 }).lean(),
    Staff.aggregate<{ _id: unknown; count: number }>([
      { $group: { _id: "$roleId", count: { $sum: 1 } } },
    ]),
  ]);
  const members = new Map(counts.map((row) => [String(row._id), row.count]));

  return roles.map((role) => ({
    id: String(role._id),
    name: role.name,
    owner: role.owner,
    permissions: role.permissions as Permission[],
    members: members.get(String(role._id)) ?? 0,
  }));
}

export async function createStaff(
  actor: Actor,
  input: z.infer<typeof newStaff>,
) {
  authorize(actor, "team.manage");
  await connectDb();

  if (!(await Role.exists({ _id: input.roleId }))) throw notFound("role");
  if (await Staff.exists({ email: input.email })) {
    throw new AppError("conflict", "That email is already on the team.", {
      email: "That email is already on the team.",
    });
  }

  await Staff.create({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    roleId: input.roleId,
  });
}

async function activeOwnerCount() {
  const ownerRoles = await Role.find({ owner: true }).distinct("_id");
  return Staff.countDocuments({ roleId: { $in: ownerRoles }, active: true });
}

export async function setStaffActive(
  actor: Actor,
  staffId: string,
  active: boolean,
) {
  authorize(actor, "team.manage");
  await connectDb();

  const member = isObjectId(staffId) ? await Staff.findById(staffId) : null;
  if (!member) throw notFound("staff member");

  if (!active) {
    if (member.id === actor.id) {
      throw new AppError("conflict", "You can't deactivate your own account.");
    }
    const role = await Role.findById(member.roleId).lean();
    if (role?.owner && member.active && (await activeOwnerCount()) === 1) {
      throw new AppError("conflict", "The team needs at least one owner.");
    }
  }

  member.active = active;
  await member.save();
  if (!active) await StaffSession.deleteMany({ staffId: member._id });
}

export async function createRole(
  actor: Actor,
  input: z.infer<typeof roleInput>,
) {
  authorize(actor, "team.manage");
  await connectDb();

  if (await Role.exists({ name: input.name })) {
    throw new AppError("conflict", "A role with that name already exists.", {
      name: "A role with that name already exists.",
    });
  }
  await Role.create(input);
}

export async function updateRolePermissions(
  actor: Actor,
  roleId: string,
  permissions: Permission[],
) {
  authorize(actor, "team.manage");
  await connectDb();

  const role = isObjectId(roleId) ? await Role.findById(roleId) : null;
  if (!role) throw notFound("role");
  if (role.owner) {
    throw new AppError("conflict", "The owner role can't be changed.");
  }

  role.permissions = permissions;
  await role.save();
}

export async function deleteRole(actor: Actor, roleId: string) {
  authorize(actor, "team.manage");
  await connectDb();

  const role = isObjectId(roleId) ? await Role.findById(roleId) : null;
  if (!role) throw notFound("role");
  if (role.owner) {
    throw new AppError("conflict", "The owner role can't be removed.");
  }
  if (await Staff.exists({ roleId: role._id })) {
    throw new AppError(
      "conflict",
      "Move its staff to another role before removing it.",
    );
  }

  await role.deleteOne();
}
