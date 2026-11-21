import { describe, expect, it } from "vitest";
import type { Actor } from "../staff/authorize";
import { withTestDatabase } from "../testing";
import {
  createCategory,
  deleteCategory,
  listAllCategories,
  listCategories,
  reorderCategory,
  updateCategory,
} from "./categories";
import {
  createField,
  fieldInput,
  fieldsForCategory,
  listFields,
  reorderField,
} from "./custom-fields";

withTestDatabase();

const owner: Actor = {
  id: "000000000000000000000001",
  name: "Priya Raman",
  email: "priya@listora.test",
  role: "Owner",
  owner: true,
  permissions: [],
};

const support: Actor = { ...owner, role: "Support", owner: false };

async function add(name: string, parent?: string) {
  const parentId = parent ? await idOf(parent) : null;
  await createCategory(owner, { name, parentId });
}

async function idOf(name: string) {
  const row = (await listAllCategories()).find((item) => item.name === name);
  return row!.id;
}

async function outline() {
  return (await listAllCategories()).map(
    (row) => `${"  ".repeat(row.depth)}${row.name}`,
  );
}

async function edit(
  name: string,
  changes: { parent?: string | null; active?: boolean; slug?: string },
) {
  const row = (await listAllCategories()).find((item) => item.name === name)!;
  const parentId =
    changes.parent === undefined
      ? row.parentId
      : changes.parent && (await idOf(changes.parent));

  await updateCategory(owner, row.id, {
    name,
    slug: changes.slug ?? row.slug,
    parentId,
    active: changes.active ?? row.active,
  });
}

const field = (label: string, categoryIds: string[]) =>
  fieldInput.parse({
    label,
    type: "text",
    options: [],
    unit: "",
    required: false,
    filterable: false,
    categoryIds,
  });

describe("the category tree", () => {
  it("lists each parent followed by its children, in the order added", async () => {
    await add("Vehicles");
    await add("Electronics");
    await add("Cars & Trucks", "Vehicles");
    await add("Motorcycles", "Vehicles");

    expect(await outline()).toEqual([
      "Vehicles",
      "  Cars & Trucks",
      "  Motorcycles",
      "Electronics",
    ]);
  });

  it("gives every category its own slug", async () => {
    await add("Vehicles");
    await add("Electronics");
    await add("Parts & Accessories", "Vehicles");
    await add("Parts & Accessories", "Electronics");

    const slugs = (await listAllCategories()).map((row) => row.slug);
    expect(slugs).toContain("parts-and-accessories");
    expect(slugs).toContain("parts-and-accessories-2");
  });

  it("swaps a category with its neighbour when reordered", async () => {
    await add("Vehicles");
    await add("Electronics");
    await add("Home & Garden");

    await reorderCategory(owner, await idOf("Home & Garden"), "up");
    expect(await outline()).toEqual([
      "Vehicles",
      "Home & Garden",
      "Electronics",
    ]);

    await reorderCategory(owner, await idOf("Vehicles"), "up");
    expect(await outline()).toEqual([
      "Vehicles",
      "Home & Garden",
      "Electronics",
    ]);
  });
});

describe("moving a category", () => {
  it("takes its whole subtree along", async () => {
    await add("Vehicles");
    await add("Hobbies");
    await add("Boats", "Vehicles");
    await add("Kayaks", "Boats");

    await edit("Boats", { parent: "Hobbies" });

    expect(await outline()).toEqual([
      "Vehicles",
      "Hobbies",
      "  Boats",
      "    Kayaks",
    ]);
  });

  it("keeps inherited fields correct after the move", async () => {
    await add("Vehicles");
    await add("Hobbies");
    await add("Boats", "Vehicles");
    await add("Kayaks", "Boats");
    await createField(owner, field("Mileage", [await idOf("Vehicles")]));
    await createField(owner, field("Skill level", [await idOf("Hobbies")]));

    await edit("Boats", { parent: "Hobbies" });

    const labels = (await fieldsForCategory(await idOf("Kayaks"))).map(
      (item) => item.label,
    );
    expect(labels).toEqual(["Skill level"]);
  });

  it("refuses to put a category under its own descendant", async () => {
    await add("Vehicles");
    await add("Boats", "Vehicles");
    await add("Kayaks", "Boats");

    await expect(edit("Vehicles", { parent: "Kayaks" })).rejects.toMatchObject({
      code: "conflict",
    });
    await expect(edit("Boats", { parent: "Boats" })).rejects.toMatchObject({
      code: "conflict",
    });
  });
});

describe("what customers see", () => {
  it("leaves out a hidden category and everything under it", async () => {
    await add("Vehicles");
    await add("Boats", "Vehicles");
    await add("Kayaks", "Boats");
    await add("Electronics");

    await edit("Boats", { active: false });

    expect((await listCategories()).map((row) => row.name)).toEqual([
      "Vehicles",
      "Electronics",
    ]);
  });
});

describe("removing a category", () => {
  it("is refused while it has subcategories", async () => {
    await add("Vehicles");
    await add("Boats", "Vehicles");

    await expect(
      deleteCategory(owner, await idOf("Vehicles")),
    ).rejects.toMatchObject({ code: "conflict" });
  });

  it("detaches the fields that pointed at it", async () => {
    await add("Vehicles");
    await createField(owner, field("Mileage", [await idOf("Vehicles")]));

    await deleteCategory(owner, await idOf("Vehicles"));

    expect((await listFields())[0].categoryIds).toEqual([]);
  });
});

describe("listing fields", () => {
  it("apply to the category they are set on and everything below it", async () => {
    await add("Vehicles");
    await add("Cars & Trucks", "Vehicles");
    await add("Electronics");
    await createField(owner, field("Condition", [await idOf("Vehicles")]));
    await createField(owner, field("Mileage", [await idOf("Cars & Trucks")]));

    const cars = await fieldsForCategory(await idOf("Cars & Trucks"));
    expect(cars.map((item) => [item.label, item.inherited])).toEqual([
      ["Condition", true],
      ["Mileage", false],
    ]);
    expect(await fieldsForCategory(await idOf("Electronics"))).toEqual([]);
  });

  it("keep the order they were added in until one is moved", async () => {
    await add("Vehicles");
    const vehicles = [await idOf("Vehicles")];
    await createField(owner, field("Make", vehicles));
    await createField(owner, field("Model", vehicles));
    await createField(owner, field("Year", vehicles));
    const labels = async () =>
      (await fieldsForCategory(vehicles[0])).map((item) => item.label);

    expect(await labels()).toEqual(["Make", "Model", "Year"]);

    const year = (await listFields()).find((item) => item.label === "Year")!;
    await reorderField(owner, year.id, "up");
    expect(await labels()).toEqual(["Make", "Year", "Model"]);
  });

  it("need at least two distinct options when they are a choice", () => {
    const choice = (options: string[]) =>
      fieldInput.safeParse({
        label: "Transmission",
        type: "select",
        options,
        unit: "",
        required: true,
        filterable: true,
        categoryIds: [],
      }).success;

    expect(choice(["Automatic"])).toBe(false);
    expect(choice(["Automatic", "automatic"])).toBe(false);
    expect(choice(["Automatic", "Manual"])).toBe(true);
  });
});

describe("permissions", () => {
  it("stop a role without categories.manage from changing the tree", async () => {
    await add("Vehicles");

    await expect(
      createCategory(support, { name: "Boats", parentId: null }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      deleteCategory(support, await idOf("Vehicles")),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      createField(support, field("Mileage", [])),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});
