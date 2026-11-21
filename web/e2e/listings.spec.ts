import { expect, type Page, test } from "@playwright/test";
import { moderator, signIn } from "./sign-in";

const count = (page: Page, status: string) =>
  page.getByRole("link", { name: new RegExp(`^${status}`) });

test("the review queue is worked oldest first, and approving shortens it", async ({
  page,
}) => {
  await signIn(page, moderator);
  await page.goto("/listings");

  await expect(
    page.getByText("5 listings are waiting for review."),
  ).toBeVisible();
  const first = page.getByRole("row").nth(1);
  await expect(first).toContainText("55-inch LG OLED C2 with wall mount");
  await expect(first).toContainText("1 d");

  await first.getByRole("link").click();
  await page.getByRole("button", { name: "Approve and publish" }).click();

  await expect(
    page.getByText("4 listings are waiting for review."),
  ).toBeVisible();
  await expect(count(page, "Live")).toContainText("52");
  await expect(
    page.getByRole("link", { name: "55-inch LG OLED C2 with wall mount" }),
  ).toHaveCount(0);
});

test("a rejection needs a reason the seller can read", async ({ page }) => {
  await signIn(page, moderator);
  await page.goto("/listings");
  await page
    .getByRole("link", { name: "Samsung Galaxy S23, cracked back glass" })
    .click();

  await page.getByRole("button", { name: "Reject" }).click();
  await expect(page.getByText("Tell the seller why.")).toBeVisible();

  await page
    .getByLabel("Reason")
    .fill("Say which corner is cracked and whether the camera is affected.");
  await page.getByRole("button", { name: "Reject" }).click();

  await count(page, "Rejected").click();
  const row = page.getByRole("row", { name: /Samsung Galaxy S23/ });
  await expect(row).toBeVisible();

  await row.getByRole("link").click();
  await expect(
    page.getByText(
      "Say which corner is cracked and whether the camera is affected.",
    ),
  ).toBeVisible();
});

test("the search in the top bar finds listings in any status", async ({
  page,
}) => {
  await signIn(page, moderator);

  // The same field also sits in the phone menu, which is closed here.
  await page
    .getByPlaceholder("Search listings")
    .filter({ visible: true })
    .fill("honda civic");
  await page.keyboard.press("Enter");

  await expect(page.getByText("1 result for “honda civic”.")).toBeVisible();
  await expect(
    page.getByRole("row", { name: /2015 Honda Civic LX, one owner/ }),
  ).toContainText("Live");
});
