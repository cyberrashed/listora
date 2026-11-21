import { expect, test } from "@playwright/test";
import { owner, signIn } from "./sign-in";

test("maintenance turned on in Settings reaches the app", async ({
  page,
  request,
}) => {
  const maintenance = async () =>
    (await (await request.get("/api/v1/app-config")).json()).maintenance;
  await signIn(page, owner);
  await page.goto("/settings");

  await page.getByLabel(/Maintenance mode/).check();
  await page.getByLabel("Oldest app version allowed").fill("1.0");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Use a version like 1.4.0.")).toBeVisible();
  // Refused, so nothing changed.
  expect(await maintenance()).toBe(false);

  await page.getByLabel("Oldest app version allowed").fill("0.1.0");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect.poll(maintenance).toBe(true);
  // The form settles (and resets) when the save's refresh lands.
  await expect(page.getByText("Saved. The app picks it up")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save settings" }),
  ).toBeEnabled();

  await page.getByLabel(/Maintenance mode/).uncheck();
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect.poll(maintenance).toBe(false);
});

test("a banner added to the home screen is in the app's home content", async ({
  page,
  request,
}) => {
  await signIn(page, owner);
  await page.goto("/home-screen/new");

  await page.getByLabel("Title").fill("Back to school");
  await page.getByLabel("Tapping it opens").selectOption("search");
  await page.getByLabel("Search for").fill("laptop");
  await page.getByRole("button", { name: "Add banner" }).click();

  await expect(
    page.getByRole("link", { name: "Back to school" }),
  ).toBeVisible();
  const { banners } = await (await request.get("/api/v1/home")).json();
  expect(banners.at(-1)).toMatchObject({
    title: "Back to school",
    link: "search",
    target: "laptop",
  });
});

test("a notification can go to one customer", async ({ page }) => {
  await signIn(page, owner);
  await page.goto("/notifications");

  await page.getByLabel("Title").fill("About your listing");
  await page.getByLabel("Message").fill("Add a photo of the serial number.");
  await page
    .getByLabel("Only to (optional)")
    .fill("miguel.ortega@postbox.example");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("Sent to 1 customer.")).toBeVisible();
});
