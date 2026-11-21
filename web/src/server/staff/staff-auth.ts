import "server-only";
import { verifyPassword } from "../auth/password";
import type { Credentials } from "../auth/schemas";
import { hashToken, randomToken } from "../auth/tokens";
import { connectDb } from "../db";
import { AppError } from "../errors";
import type { Actor } from "./authorize";
import type { Permission } from "./permissions";
import { Role, Staff, StaffSession } from "./staff.model";

export const STAFF_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function signIn({ email, password }: Credentials) {
  await connectDb();

  const staff = await Staff.findOne({ email });
  if (
    !staff ||
    !staff.active ||
    !(await verifyPassword(password, staff.passwordHash))
  ) {
    throw new AppError(
      "unauthenticated",
      "That email and password don't match.",
    );
  }

  const token = randomToken();
  const expiresAt = new Date(Date.now() + STAFF_SESSION_TTL_MS);
  await StaffSession.create({
    staffId: staff._id,
    tokenHash: hashToken(token),
    expiresAt,
  });

  return { token, expiresAt };
}

export async function signOut(token: string) {
  await connectDb();
  await StaffSession.deleteOne({ tokenHash: hashToken(token) });
}

export async function findActor(token: string): Promise<Actor | null> {
  await connectDb();

  const session = await StaffSession.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!session) return null;

  const staff = await Staff.findById(session.staffId).lean();
  if (!staff?.active) return null;

  const role = await Role.findById(staff.roleId).lean();
  if (!role) return null;

  return {
    id: String(staff._id),
    name: staff.name,
    email: staff.email,
    role: role.name,
    owner: role.owner,
    permissions: role.permissions as Permission[],
  };
}
