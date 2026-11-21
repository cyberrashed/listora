import "server-only";
import type { Types } from "mongoose";
import { z } from "zod";
import { connectDb, isObjectId } from "../db";
import { AppError } from "../errors";
import { type Actor, authorize } from "../staff/authorize";
import { Category, CustomField } from "./category.model";

const optionalId = z
  .string()
  .refine((value) => value === "" || isObjectId(value), "Choose a category.")
  .transform((value) => value || null);

export const newCategory = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(60),
  parentId: optionalId,
});

export const categoryUpdate = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(60),
  slug: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers and hyphens.",
    ),
  parentId: optionalId,
  active: z.boolean(),
});

const notFound = () =>
  new AppError("not_found", "That category no longer exists.");

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function uniqueSlug(name: string) {
  const base = slugify(name) || "category";
  for (let suffix = 1; ; suffix++) {
    const slug = suffix === 1 ? base : `${base}-${suffix}`;
    if (!(await Category.exists({ slug }))) return slug;
  }
}

async function findCategory(id: string) {
  const category = isObjectId(id) ? await Category.findById(id) : null;
  if (!category) throw notFound();
  return category;
}

async function ancestorsFor(parentId: string | null) {
  if (!parentId) return [];
  const parent = await Category.findById(parentId).lean();
  if (!parent) throw new AppError("not_found", "That parent no longer exists.");
  return [...parent.ancestors, parent._id];
}

async function nextOrder(parentId: string | Types.ObjectId | null) {
  const last = await Category.findOne({ parentId }).sort({ order: -1 }).lean();
  return (last?.order ?? 0) + 1;
}

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  depth: number;
  active: boolean;
};

/** Every category in tree order: each parent followed by its children. */
async function tree(): Promise<CategoryRow[]> {
  const categories = await Category.find().sort({ order: 1 }).lean();
  const children = new Map<string, typeof categories>();
  for (const category of categories) {
    const key = String(category.parentId ?? "");
    children.set(key, [...(children.get(key) ?? []), category]);
  }

  const rows: CategoryRow[] = [];
  const walk = (parentKey: string, depth: number) => {
    for (const category of children.get(parentKey) ?? []) {
      const id = String(category._id);
      rows.push({
        id,
        name: category.name,
        slug: category.slug,
        parentId: category.parentId ? String(category.parentId) : null,
        depth,
        active: category.active,
      });
      walk(id, depth + 1);
    }
  };
  walk("", 0);
  return rows;
}

/** The tree as customers see it: a hidden category hides everything under it. */
export async function listCategories() {
  await connectDb();

  const hidden = new Set<string>();
  return (await tree()).filter((row) => {
    if (row.active && !(row.parentId && hidden.has(row.parentId))) return true;
    hidden.add(row.id);
    return false;
  });
}

/** The whole tree for staff, with how many fields sit directly on each. */
export async function listAllCategories() {
  await connectDb();

  const [rows, counts] = await Promise.all([
    tree(),
    CustomField.aggregate<{ _id: unknown; count: number }>([
      { $unwind: "$categoryIds" },
      { $group: { _id: "$categoryIds", count: { $sum: 1 } } },
    ]),
  ]);
  const fields = new Map(counts.map((row) => [String(row._id), row.count]));

  return rows.map((row) => ({ ...row, fields: fields.get(row.id) ?? 0 }));
}

export async function getCategory(id: string) {
  await connectDb();
  const category = await findCategory(id);

  return {
    id: category.id as string,
    name: category.name,
    slug: category.slug,
    parentId: category.parentId ? String(category.parentId) : null,
    active: category.active,
  };
}

export async function createCategory(
  actor: Actor,
  input: z.infer<typeof newCategory>,
) {
  authorize(actor, "categories.manage");
  await connectDb();

  const category = await Category.create({
    name: input.name,
    slug: await uniqueSlug(input.name),
    parentId: input.parentId,
    ancestors: await ancestorsFor(input.parentId),
    order: await nextOrder(input.parentId),
  });
  return category.id as string;
}

export async function updateCategory(
  actor: Actor,
  id: string,
  input: z.infer<typeof categoryUpdate>,
) {
  authorize(actor, "categories.manage");
  await connectDb();

  const category = await findCategory(id);

  if (await Category.exists({ slug: input.slug, _id: { $ne: category._id } })) {
    throw new AppError("conflict", "Another category uses that slug.", {
      slug: "Another category uses that slug.",
    });
  }

  const moving = String(category.parentId ?? "") !== (input.parentId ?? "");
  if (moving) {
    const ancestors = await ancestorsFor(input.parentId);
    const intoItself = [input.parentId, ...ancestors.map(String)].includes(
      category.id as string,
    );
    if (intoItself) {
      throw new AppError(
        "conflict",
        "A category can't be moved under itself.",
        { parentId: "A category can't be moved under itself." },
      );
    }

    // Everything below keeps its own path and gets the new one in front.
    const below = await Category.find({ ancestors: category._id });
    await Category.bulkWrite(
      below.map((descendant) => ({
        updateOne: {
          filter: { _id: descendant._id },
          update: {
            ancestors: [
              ...ancestors,
              ...descendant.ancestors.slice(
                descendant.ancestors.findIndex((ancestor) =>
                  ancestor.equals(category._id),
                ),
              ),
            ],
          },
        },
      })),
    );

    category.set({
      parentId: input.parentId,
      ancestors,
      order: await nextOrder(input.parentId),
    });
  }

  category.set({ name: input.name, slug: input.slug, active: input.active });
  await category.save();
}

/** Swaps a category with the sibling before or after it. */
export async function reorderCategory(
  actor: Actor,
  id: string,
  direction: "up" | "down",
) {
  authorize(actor, "categories.manage");
  await connectDb();

  const category = await findCategory(id);
  const neighbour = await Category.findOne({
    parentId: category.parentId,
    order:
      direction === "up" ? { $lt: category.order } : { $gt: category.order },
  }).sort({ order: direction === "up" ? -1 : 1 });
  if (!neighbour) return;

  const order = category.order;
  category.order = neighbour.order;
  neighbour.order = order;
  await Promise.all([category.save(), neighbour.save()]);
}

export async function deleteCategory(actor: Actor, id: string) {
  authorize(actor, "categories.manage");
  await connectDb();

  const category = await findCategory(id);
  if (await Category.exists({ parentId: category._id })) {
    throw new AppError("conflict", "Move or remove its subcategories first.");
  }

  await CustomField.updateMany(
    { categoryIds: category._id },
    { $pull: { categoryIds: category._id } },
  );
  await category.deleteOne();
}
