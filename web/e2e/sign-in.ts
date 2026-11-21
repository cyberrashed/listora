import { type Cookie, expect, type Page } from "@playwright/test";

export const owner = "priya.raman@listora.test";
export const moderator = "marcus.bell@listora.test";

const overview = (page: Page) =>
  page.getByRole("heading", { name: "Overview" });

// Sign-in allows ten tries a minute from one address, which a full run goes
// past. Each account signs in through the form once; later tests reuse it.
const sessions = new Map<string, Cookie[]>();

export async function signIn(page: Page, email: string) {
  const saved = sessions.get(email);
  if (saved) {
    await page.context().clearCookies();
    await page.context().addCookies(saved);
    await page.goto("/");
    const signedIn = await overview(page)
      .waitFor({ timeout: 5000 })
      .then(
        () => true,
        () => false,
      );
    if (signedIn) return;
    await page.context().clearCookies();
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(process.env.SEED_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(overview(page)).toBeVisible();
  sessions.set(email, await page.context().cookies());
}
