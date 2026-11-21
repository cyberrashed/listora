import { AppError } from "../errors";
import type { Permission } from "./permissions";

// The signed-in staff member, as every service function receives it.
export type Actor = {
  id: string;
  name: string;
  email: string;
  role: string;
  owner: boolean;
  permissions: readonly Permission[];
};

export function can(actor: Actor, permission: Permission) {
  return actor.owner || actor.permissions.includes(permission);
}

export function authorize(actor: Actor, permission: Permission) {
  if (!can(actor, permission)) {
    throw new AppError("forbidden", "Your role doesn't allow that.");
  }
}
