import { expect, test } from "@playwright/test";
import { owner, signIn } from "./sign-in";

test("a package given to a customer shows up as theirs", async ({ page }) => {
  await signIn(page, owner);
  await page.goto("/packages");

  await expect(page.getByRole("link", { name: "Seller Pro" })).toBeVisible();
  await page.getByLabel("Package").selectOption({ label: "Spotlight" });
  await page.getByLabel("Customer's email").fill("nobody@inbox.example");
  await page.getByRole("button", { name: "Give package" }).click();
  await expect(page.getByText("No customer has that email.")).toBeVisible();

  await page.getByLabel("Customer's email").fill("hannah.brooks@inbox.example");
  await page.getByRole("button", { name: "Give package" }).click();
  await expect(page.getByText("Given. They get a notification")).toBeVisible();

  await page.goto("/team/activity");
  await expect(page.getByRole("row").nth(1)).toContainText(
    "Priya Raman gave the package Spotlight",
  );
});

test("a package's price is checked before it is saved", async ({ page }) => {
  await signIn(page, owner);
  await page.goto("/packages/new");

  await page.getByLabel("Name").fill("Weekend boost");
  await page.getByLabel("What it gives").selectOption("featured");
  await page.getByLabel("Price ($)").fill("0.25");
  await page.getByLabel("How many").fill("1");
  await page.getByRole("button", { name: "Add package" }).click();
  await expect(page.getByText("Stripe takes at least $0.50.")).toBeVisible();
  // What was typed stays.
  await expect(page.getByLabel("Name")).toHaveValue("Weekend boost");

  await page.getByLabel("Price ($)").fill("2.99");
  await page.getByRole("button", { name: "Add package" }).click();
  await expect(page.getByRole("link", { name: "Weekend boost" })).toBeVisible();
});

test("payments add up for the month", async ({ page }) => {
  await signIn(page, owner);
  await page.goto("/payments");

  await expect(page.getByRole("row")).toHaveCount(16);
  await expect(page.getByText("15 payments in all.")).toBeVisible();
});
