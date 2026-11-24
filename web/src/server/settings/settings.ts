import "server-only";
import { z } from "zod";
import { record } from "../activity/activity";
import { connectDb } from "../db";
import { refuseInDemo } from "../demo";
import { type Actor, authorize } from "../staff/authorize";
import { Settings } from "./settings.model";

export const settingsInput = z.object({
  freeListingsPerMonth: z
    .number()
    .int("Use a whole number.")
    .min(0, "Use 0 or more.")
    .max(100, "Use 100 or fewer."),
  maintenance: z.boolean(),
  maintenanceMessage: z
    .string()
    .trim()
    .min(10, "Say what is happening.")
    .max(200, "Use 200 characters or fewer."),
  minAppVersion: z
    .string()
    .trim()
    .regex(/^\d+\.\d+\.\d+$/, "Use a version like 1.4.0."),
  supportEmail: z.email("Enter an email address."),
});

/** The settings, with the defaults until staff first save them. */
export async function getSettings() {
  await connectDb();
  const row =
    (await Settings.findOne({ key: "app" }).lean()) ??
    new Settings().toObject();
  return {
    freeListingsPerMonth: row.freeListingsPerMonth,
    maintenance: row.maintenance,
    maintenanceMessage: row.maintenanceMessage,
    minAppVersion: row.minAppVersion,
    supportEmail: row.supportEmail,
  };
}

export async function updateSettings(
  actor: Actor,
  input: z.infer<typeof settingsInput>,
) {
  authorize(actor, "settings.manage");
  refuseInDemo();
  await connectDb();

  const before = await getSettings();
  const row = await Settings.findOneAndUpdate({ key: "app" }, input, {
    upsert: true,
    returnDocument: "after",
  });

  const changed = (Object.keys(input) as (keyof typeof input)[]).filter(
    (name) => before[name] !== input[name],
  );
  if (changed.length > 0) {
    await record(actor, {
      action: "settings.changed",
      target: { kind: "settings", id: row._id, label: "Settings" },
      note: changed.map((name) => labels[name]).join(", "),
    });
  }
}

const labels: Record<keyof z.infer<typeof settingsInput>, string> = {
  freeListingsPerMonth: "Free listings a month",
  maintenance: "Maintenance",
  maintenanceMessage: "Maintenance message",
  minAppVersion: "Oldest app allowed",
  supportEmail: "Support email",
};

/** What the app needs to know before it starts. */
export async function appConfig() {
  const settings = await getSettings();
  return {
    maintenance: settings.maintenance,
    maintenanceMessage: settings.maintenanceMessage,
    minAppVersion: settings.minAppVersion,
    supportEmail: settings.supportEmail,
    freeListingsPerMonth: settings.freeListingsPerMonth,
  };
}
