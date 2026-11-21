"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  categoryUpdate,
  createCategory,
  deleteCategory,
  newCategory,
  reorderCategory,
  updateCategory,
} from "@/server/categories/categories";
import {
  createField,
  deleteField,
  fieldInput,
  reorderField,
  updateField,
} from "@/server/categories/custom-fields";
import { requireStaff } from "../auth/current-staff";
import { failed, type FormState, invalid, keep } from "../form-state";

const direction = (formData: FormData) =>
  formData.get("direction") === "up" ? "up" : "down";

export async function createCategoryAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();
  const input = newCategory.safeParse(Object.fromEntries(formData));
  const values = keep(formData, "name", "parentId");
  if (!input.success) return { ...invalid(input.error), values };

  try {
    await createCategory(actor, input.data);
  } catch (error) {
    return { ...failed(error), values };
  }
  refresh();
  // The parent stays selected, so several siblings can be added in a row.
  return { saved: true, values: { parentId: values.parentId } };
}

export async function updateCategoryAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();
  const values = keep(formData, "name", "slug", "parentId");
  const input = categoryUpdate.safeParse({
    ...values,
    active: formData.get("active") === "on",
  });
  if (!input.success) return { ...invalid(input.error), values };

  try {
    await updateCategory(actor, String(formData.get("id")), input.data);
  } catch (error) {
    return { ...failed(error), values };
  }
  redirect("/categories");
}

export async function reorderCategoryAction(formData: FormData) {
  const actor = await requireStaff();
  await reorderCategory(actor, String(formData.get("id")), direction(formData));
  refresh();
}

export async function deleteCategoryAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();

  try {
    await deleteCategory(actor, String(formData.get("id")));
  } catch (error) {
    return failed(error);
  }
  redirect("/categories");
}

export async function saveFieldAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();
  const categoryIds = formData.getAll("categoryIds").map(String);
  const values: Record<string, string> = {
    ...keep(formData, "label", "type", "options", "unit"),
    required: formData.get("required") === "on" ? "on" : "",
    filterable: formData.get("filterable") === "on" ? "on" : "",
    categoryIds: categoryIds.join(","),
  };

  const input = fieldInput.safeParse({
    label: values.label,
    type: values.type,
    options: values.options
      .split("\n")
      .map((option) => option.trim())
      .filter(Boolean),
    unit: values.unit,
    required: values.required === "on",
    filterable: values.filterable === "on",
    categoryIds,
  });
  if (!input.success) return { ...invalid(input.error), values };

  const id = formData.get("id");
  try {
    if (id) await updateField(actor, String(id), input.data);
    else await createField(actor, input.data);
  } catch (error) {
    return { ...failed(error), values };
  }
  redirect("/categories/fields");
}

export async function reorderFieldAction(formData: FormData) {
  const actor = await requireStaff();
  await reorderField(actor, String(formData.get("id")), direction(formData));
  refresh();
}

export async function deleteFieldAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();

  try {
    await deleteField(actor, String(formData.get("id")));
  } catch (error) {
    return failed(error);
  }
  redirect("/categories/fields");
}
