import { type APIRequestContext, expect, test } from "@playwright/test";
import { moderator, owner, signIn } from "./sign-in";

type Category = { id: string; name: string };

async function appCategories(request: APIRequestContext) {
  const response = await request.get("/api/v1/categories");
  return (await response.json()) as Category[];
}

test("a category and a field added in the dashboard reach the app", async ({
  page,
  request,
}) => {
  await signIn(page, owner);

  await page.goto("/categories");
  const parent = page.getByLabel("Under");
  await parent.selectOption(
    await parent.locator("option", { hasText: "Boats" }).getAttribute("value"),
  );
  await page.getByLabel("New category").fill("Kayaks & Canoes");
  await page.getByRole("button", { name: "Add category" }).click();
  await expect(
    page.getByRole("link", { name: "Kayaks & Canoes" }),
  ).toBeVisible();

  await page.goto("/categories/fields/new");
  await page.getByLabel("Label", { exact: true }).fill("Hull length");
  await page.getByLabel("Answer").selectOption("number");
  await page.getByLabel("Unit (optional)").fill("ft");
  await page.getByLabel("Buyers can filter by it").check();
  await page.getByLabel("Boats", { exact: true }).check();
  await page.getByRole("button", { name: "Create field" }).click();
  await expect(page.getByRole("link", { name: "Hull length" })).toBeVisible();

  // The field was set on Boats, so the new subcategory inherits it.
  const kayaks = (await appCategories(request)).find(
    (category) => category.name === "Kayaks & Canoes",
  );
  const fields = await request.get(`/api/v1/categories/${kayaks!.id}/fields`);
  expect(await fields.json()).toContainEqual(
    expect.objectContaining({
      label: "Hull length",
      type: "number",
      unit: "ft",
      filterable: true,
      inherited: true,
    }),
  );
});

test("hiding a category takes its subcategories out of the app", async ({
  page,
  request,
}) => {
  await signIn(page, owner);

  await page.goto("/categories");
  await page.getByRole("link", { name: "Electronics" }).click();
  await page.getByLabel(/Shown to customers/).uncheck();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("row", { name: /Electronics/ }).getByText("Hidden"),
  ).toBeVisible();

  const names = (await appCategories(request)).map((category) => category.name);
  expect(names).not.toContain("Electronics");
  expect(names).not.toContain("Cell Phones");
  expect(names).toContain("Vehicles");
});

test("a choice field is refused without two choices, and keeps what was typed", async ({
  page,
}) => {
  await signIn(page, owner);

  await page.goto("/categories/fields/new");
  await page.getByLabel("Label", { exact: true }).fill("Drive type");
  await page.getByLabel("Answer").selectOption("select");
  await page.getByLabel("Choices").fill("All-wheel drive");
  await page.getByRole("button", { name: "Create field" }).click();

  await expect(
    page.getByText("Give at least two options, one per line."),
  ).toBeVisible();
  await expect(page.getByLabel("Label", { exact: true })).toHaveValue(
    "Drive type",
  );
});

test("a role without the permission can read the tree but not change it", async ({
  page,
}) => {
  await signIn(page, moderator);

  await page.goto("/categories");
  await expect(
    page.getByRole("cell", { name: "Vehicles", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Add category" })).toHaveCount(
    0,
  );

  await page.goto("/categories/fields/new");
  await expect(
    page.getByText("Your role doesn't include this section."),
  ).toBeVisible();

  await page.goto("/team");
  await expect(
    page.getByText("Your role doesn't include this section."),
  ).toBeVisible();
});
