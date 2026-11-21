import { expect, test } from "@playwright/test";
import { moderator, owner, signIn } from "./sign-in";

test("a report is decided, settles its duplicates and lands in the activity log", async ({
  page,
}) => {
  await signIn(page, moderator);
  await page.goto("/reports");

  await expect(page.getByText("4 reports need a decision.")).toBeVisible();
  await page
    .getByRole("link", { name: "Nintendo Switch OLED, white" })
    .first()
    .click();
  await expect(page.getByText("1 other person reported it too.")).toBeVisible();

  await page.getByLabel("Take the listing down").check();
  await page.getByRole("button", { name: "Decide" }).click();

  // Both reports on the listing are settled by the one decision.
  await expect(page.getByText("2 reports need a decision.")).toBeVisible();
  await page.goto("/reports?status=resolved");
  await expect(
    page.getByRole("link", { name: "Nintendo Switch OLED, white" }),
  ).toHaveCount(2);

  await page.context().clearCookies();
  await signIn(page, owner);
  await page.goto("/team/activity");
  const latest = page.getByRole("row").nth(1);
  await expect(latest).toContainText(
    "Marcus Bell acted on a report about Nintendo Switch OLED, white",
  );
  await expect(page.getByRole("row").nth(2)).toContainText(
    "Marcus Bell rejected the listing Nintendo Switch OLED, white",
  );
});

test("a verification request can be turned down with a reason", async ({
  page,
}) => {
  await signIn(page, moderator);
  await page.goto("/verification");
  await expect(
    page.getByText("2 sellers are waiting to be verified."),
  ).toBeVisible();

  const request = page
    .getByRole("listitem")
    .filter({ hasText: "Mei-Ling Chow" });
  await request.getByRole("button", { name: "Turn down" }).click();
  await expect(request.getByText("Tell them why.")).toBeVisible();

  await request
    .getByLabel("Reason for turning it down")
    .fill("We couldn't reach the phone number you gave.");
  await request.getByRole("button", { name: "Turn down" }).click();
  await expect(
    page.getByText("1 seller is waiting to be verified."),
  ).toBeVisible();
});

test("hiding a review takes it off the visible list", async ({ page }) => {
  await signIn(page, moderator);
  await page.goto("/reviews");

  const rude = page.getByRole("row").filter({ hasText: "Rude seller" });
  await rude.getByRole("button", { name: "Hide" }).click();
  await expect(rude).toHaveCount(0);

  await page.getByRole("link", { name: "Hidden (1)" }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "Rude seller" }),
  ).toHaveCount(1);
});
