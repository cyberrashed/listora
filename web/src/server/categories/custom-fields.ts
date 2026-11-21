import "server-only";
import { z } from "zod";
import { connectDb, isObjectId } from "../db";
import { AppError } from "../errors";
import { type Actor, authorize } from "../staff/authorize";
import {
  Category,
  CustomField,
  type CustomFieldFields,
  fieldTypes,
} from "./category.model";

const hasOptions = (type: string) =>
  type === "select" || type === "multiselect";

export const fieldInput = z
  .object({
    label: z.string().trim().min(2, "Enter a label.").max(40),
    type: z.enum(fieldTypes),
    options: z.array(z.string().trim().min(1).max(40)),
    unit: z.string().trim().max(12),
    required: z.boolean(),
    filterable: z.boolean(),
    categoryIds: z.array(z.string().refine(isObjectId)),
  })
  .superRefine((field, context) => {
    if (!hasOptions(field.type)) return;

    const options = field.options.map((option) => option.toLowerCase());
    if (options.length < 2) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Give at least two options, one per line.",
      });
    } else if (new Set(options).size !== options.length) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Each option can appear once.",
      });
    }
  });

type FieldInput = z.infer<typeof fieldInput>;

// Options only mean something for a choice, and a unit only for a number.
function normalise(input: FieldInput) {
  return {
    ...input,
    options: hasOptions(input.type) ? input.options : [],
    unit: input.type === "number" && input.unit ? input.unit : undefined,
  };
}

type FieldDoc = CustomFieldFields & { _id: unknown };

function toFieldDto(field: FieldDoc) {
  return {
    id: String(field._id),
    label: field.label,
    type: field.type,
    options: field.options,
    unit: field.unit ?? null,
    required: field.required,
    filterable: field.filterable,
  };
}

const notFound = () =>
  new AppError("not_found", "That field no longer exists.");

/** The fields a listing in this category carries, inherited ones included. */
export async function fieldsForCategory(categoryId: string) {
  await connectDb();

  const category = isObjectId(categoryId)
    ? await Category.findById(categoryId).lean()
    : null;
  if (!category) {
    throw new AppError("not_found", "That category no longer exists.");
  }

  const fields = await CustomField.find({
    categoryIds: { $in: [...category.ancestors, category._id] },
  })
    .sort({ order: 1 })
    .lean();

  return fields.map((field) => ({
    ...toFieldDto(field),
    inherited: !field.categoryIds.some((id) => id.equals(category._id)),
  }));
}

export async function listFields() {
  await connectDb();

  const fields = await CustomField.find().sort({ order: 1 }).lean();
  return fields.map((field) => ({
    ...toFieldDto(field),
    categoryIds: field.categoryIds.map(String),
  }));
}

export async function getField(id: string) {
  await connectDb();

  const field = isObjectId(id) ? await CustomField.findById(id).lean() : null;
  if (!field) throw notFound();
  return { ...toFieldDto(field), categoryIds: field.categoryIds.map(String) };
}

export async function createField(actor: Actor, input: FieldInput) {
  authorize(actor, "categories.manage");
  await connectDb();

  const last = await CustomField.findOne().sort({ order: -1 }).lean();
  await CustomField.create({
    ...normalise(input),
    order: (last?.order ?? 0) + 1,
  });
}

/** Swaps a field with the one before or after it. */
export async function reorderField(
  actor: Actor,
  id: string,
  direction: "up" | "down",
) {
  authorize(actor, "categories.manage");
  await connectDb();

  const field = isObjectId(id) ? await CustomField.findById(id) : null;
  if (!field) throw notFound();

  const neighbour = await CustomField.findOne({
    order: direction === "up" ? { $lt: field.order } : { $gt: field.order },
  }).sort({ order: direction === "up" ? -1 : 1 });
  if (!neighbour) return;

  const order = field.order;
  field.order = neighbour.order;
  neighbour.order = order;
  await Promise.all([field.save(), neighbour.save()]);
}

export async function updateField(actor: Actor, id: string, input: FieldInput) {
  authorize(actor, "categories.manage");
  await connectDb();

  const field = isObjectId(id) ? await CustomField.findById(id) : null;
  if (!field) throw notFound();

  field.set(normalise(input));
  await field.save();
}

export async function deleteField(actor: Actor, id: string) {
  authorize(actor, "categories.manage");
  await connectDb();

  const result = isObjectId(id)
    ? await CustomField.deleteOne({ _id: id })
    : { deletedCount: 0 };
  if (result.deletedCount === 0) throw notFound();
}
