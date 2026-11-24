import "server-only";
import { AppError } from "./errors";

// The public copy of the back office. Anyone can open the seeded staff
// accounts with one click, and the daily job seeds the data again, so what one
// visitor changes is gone the next day.
export const demoMode = () => process.env.DEMO_MODE === "true";

export const demoAccounts = {
  owner: {
    email: "priya.raman@listora.test",
    name: "Priya Raman",
    role: "Owner",
    does: "Can do everything.",
  },
  moderator: {
    email: "marcus.bell@listora.test",
    name: "Marcus Bell",
    role: "Moderator",
    does: "Reviews listings, reports, reviews and verification.",
  },
  support: {
    email: "elena.vasquez@listora.test",
    name: "Elena Vasquez",
    role: "Support",
    does: "Sees customers, payments and the email log.",
  },
} as const;

export type DemoAccount = keyof typeof demoAccounts;

export const isDemoAccount = (value: unknown): value is DemoAccount =>
  typeof value === "string" && Object.hasOwn(demoAccounts, value);

// The team and the settings stay as seeded, so one visitor can't lock the
// next one out or put the marketplace into maintenance.
export function refuseInDemo() {
  if (demoMode()) {
    throw new AppError("forbidden", "That's turned off in the public demo.");
  }
}
