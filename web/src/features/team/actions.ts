"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { permissionKeys } from "@/server/staff/permissions";
import {
  createRole,
  createStaff,
  deleteRole,
  newStaff,
  roleInput,
  setStaffActive,
  updateRolePermissions,
} from "@/server/staff/team";
import { requireStaff } from "../auth/current-staff";
import { failed, type FormState, invalid, keep } from "../form-state";

const permissionList = z.array(z.enum(permissionKeys));

export async function createStaffAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();
  const input = newStaff.safeParse(Object.fromEntries(formData));
  const values = keep(formData, "name", "email", "roleId");
  if (!input.success) return { ...invalid(input.error), values };

  try {
    await createStaff(actor, input.data);
  } catch (error) {
    return { ...failed(error), values };
  }
  redirect("/team");
}

export async function setStaffActiveAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();

  try {
    await setStaffActive(
      actor,
      String(formData.get("id")),
      formData.get("active") === "true",
    );
  } catch (error) {
    return failed(error);
  }
  refresh();
}

export async function createRoleAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();
  const input = roleInput.safeParse({
    name: formData.get("name"),
    permissions: formData.getAll("permissions"),
  });
  const values = keep(formData, "name");
  if (!input.success) return { ...invalid(input.error), values };

  try {
    await createRole(actor, input.data);
  } catch (error) {
    return { ...failed(error), values };
  }
  refresh();
  return { saved: true };
}

export async function updateRoleAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();
  const permissions = permissionList.safeParse(formData.getAll("permissions"));
  if (!permissions.success) return invalid(permissions.error);

  try {
    await updateRolePermissions(
      actor,
      String(formData.get("id")),
      permissions.data,
    );
  } catch (error) {
    return failed(error);
  }
  refresh();
  return { saved: true };
}

export async function deleteRoleAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();

  try {
    await deleteRole(actor, String(formData.get("id")));
  } catch (error) {
    return failed(error);
  }
  refresh();
}
