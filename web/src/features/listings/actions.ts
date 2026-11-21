"use server";

import { redirect } from "next/navigation";
import {
  approveListing,
  rejectionInput,
  rejectListing,
} from "@/server/listings/listings";
import { requireStaff } from "../auth/current-staff";
import { failed, type FormState, invalid, keep } from "../form-state";

export async function approveListingAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();

  try {
    await approveListing(actor, String(formData.get("id")));
  } catch (error) {
    return failed(error);
  }
  redirect("/listings");
}

export async function rejectListingAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();
  const values = keep(formData, "kind", "reason");
  const input = rejectionInput.safeParse(values);
  if (!input.success) return { ...invalid(input.error), values };

  try {
    await rejectListing(actor, String(formData.get("id")), input.data);
  } catch (error) {
    return { ...failed(error), values };
  }
  redirect("/listings");
}
