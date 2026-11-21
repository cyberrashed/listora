import "server-only";
import mongoose, { type InferSchemaType, type Model, Schema } from "mongoose";

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    parentId: { type: Schema.Types.ObjectId, default: null, index: true },
    // Every category above this one, root first. It turns "this category
    // and everything under it" into a single indexed query.
    ancestors: { type: [Schema.Types.ObjectId], default: [], index: true },
    order: { type: Number, required: true },
    active: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

export const fieldTypes = [
  "text",
  "number",
  "select",
  "multiselect",
  "boolean",
] as const;

const customFieldSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: fieldTypes, required: true },
    options: { type: [String], default: [] },
    unit: String,
    required: { type: Boolean, default: false, required: true },
    filterable: { type: Boolean, default: false, required: true },
    // A field applies to these categories and to everything under them.
    categoryIds: { type: [Schema.Types.ObjectId], default: [], index: true },
    // One order for all fields, so a form lists them the same way everywhere.
    order: { type: Number, required: true },
  },
  { timestamps: true },
);

export type CategoryFields = InferSchemaType<typeof categorySchema>;
export type CustomFieldFields = InferSchemaType<typeof customFieldSchema>;

export const Category: Model<CategoryFields> =
  mongoose.models.Category ?? mongoose.model("Category", categorySchema);
export const CustomField: Model<CustomFieldFields> =
  mongoose.models.CustomField ??
  mongoose.model("CustomField", customFieldSchema);
