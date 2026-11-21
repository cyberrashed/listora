"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  type Resolution,
  resolutions,
  resolveReport,
} from "@/server/reports/reports";
import { setReviewHidden } from "@/server/reviews/reviews";
import {
  decideVerification,
  decisionInput,
} from "@/server/verification/verification";
import { requireStaff } from "../auth/current-staff";
import { failed, type FormState, invalid, keep } from "../form-state";

export async function resolveReportAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();
  const resolution = String(formData.get("resolution"));
  if (!(resolution in resolutions)) return { message: "Choose what to do." };

  try {
    await resolveReport(
      actor,
      String(formData.get("id")),
      resolution as Resolution,
    );
  } catch (error) {
    return failed(error);
  }
  redirect("/reports");
}

export async function setReviewHiddenAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();

  try {
    await setReviewHidden(
      actor,
      String(formData.get("id")),
      formData.get("hidden") === "true",
    );
  } catch (error) {
    return failed(error);
  }
  refresh();
}

export async function decideVerificationAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();
  const values = keep(formData, "reason");
  const input = decisionInput.safeParse(
    formData.get("approve") === "true"
      ? { approve: true }
      : { approve: false, reason: values.reason },
  );
  if (!input.success) return { ...invalid(input.error), values };

  try {
    await decideVerification(actor, String(formData.get("id")), input.data);
  } catch (error) {
    return { ...failed(error), values };
  }
  refresh();
}
