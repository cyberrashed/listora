"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  createPackage,
  grantInput,
  grantPackage,
  packageInput,
  updatePackage,
} from "@/server/packages/packages";
import { requireStaff } from "../auth/current-staff";
import { failed, type FormState, invalid, keep } from "../form-state";

const dollars = (value: string) => Math.round(Number(value) * 100);
const whole = (value: string) => (value.trim() ? Number(value) : NaN);

function readPackage(formData: FormData) {
  const values = keep(
    formData,
    "name",
    "kind",
    "price",
    "quantity",
    "days",
    "featureDays",
    "categoryId",
    "active",
  );
  const input = packageInput.safeParse({
    name: values.name,
    kind: values.kind,
    priceCents: dollars(values.price),
    quantity: whole(values.quantity),
    days: whole(values.days),
    featureDays: values.featureDays ? whole(values.featureDays) : null,
    categoryId: values.categoryId || null,
    active: values.active === "on",
  });
  return { values, input };
}

// Field errors come back under the form's own names.
function renamed(state: FormState) {
  if (!state?.errors) return state;
  const { priceCents, ...rest } = state.errors;
  return {
    ...state,
    errors: { ...rest, ...(priceCents && { price: priceCents }) },
  };
}

export async function savePackageAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();
  const { values, input } = readPackage(formData);
  if (!input.success) return { ...renamed(invalid(input.error)), values };

  const id = String(formData.get("id") ?? "");
  try {
    if (id) await updatePackage(actor, id, input.data);
    else await createPackage(actor, input.data);
  } catch (error) {
    return { ...failed(error), values };
  }
  redirect("/packages");
}

export async function grantPackageAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();
  const values = keep(formData, "packageId", "email");
  const input = grantInput.safeParse(values);
  if (!input.success) return { ...invalid(input.error), values };

  try {
    await grantPackage(actor, input.data);
  } catch (error) {
    return { ...failed(error), values };
  }
  refresh();
  return { saved: true };
}
