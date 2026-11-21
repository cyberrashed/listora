"use server";

import { refresh } from "next/cache";
import { setCustomerStatus } from "@/server/users/users";
import { requireStaff } from "../auth/current-staff";
import { failed, type FormState } from "../form-state";

export async function setCustomerStatusAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();

  try {
    await setCustomerStatus(
      actor,
      String(formData.get("id")),
      formData.get("status") === "suspended" ? "suspended" : "active",
    );
  } catch (error) {
    return failed(error);
  }
  refresh();
}
