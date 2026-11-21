import "server-only";
import type { Types } from "mongoose";
import { z } from "zod";
import { record } from "../activity/activity";
import { connectDb, isObjectId } from "../db";
import { AppError } from "../errors";
import { notify } from "../notifications/notifications";
import { type Actor, authorize } from "../staff/authorize";
import { User, type UserDoc } from "../users/user.model";
import { ensureFreeCredits } from "./credits";
import {
  Package,
  type PackageFields,
  packageKinds,
  Payment,
  Subscription,
  type SubscriptionFields,
} from "./package.model";

const DAY = 86_400_000;

export const packageInput = z
  .object({
    name: z.string().trim().min(2, "Give it a name.").max(40),
    kind: z.enum(packageKinds),
    priceCents: z
      .number()
      .int()
      .min(50, "Stripe takes at least $0.50.")
      .max(100_000_00, "That price is too high."),
    quantity: z.number().int().min(1, "At least one.").max(1000),
    days: z.number().int().min(1, "At least one day.").max(365),
    featureDays: z.number().int().min(1).max(90).nullable(),
    categoryId: z.string().refine(isObjectId).nullable(),
    active: z.boolean(),
  })
  .refine((input) => input.kind !== "featured" || input.featureDays, {
    path: ["featureDays"],
    message: "Say how long a listing stays featured.",
  });

type PackageRow = PackageFields & { _id: Types.ObjectId };

function toPackageDto(row: PackageRow) {
  return {
    id: String(row._id),
    name: row.name,
    kind: row.kind,
    priceCents: row.priceCents,
    quantity: row.quantity,
    days: row.days,
    featureDays: row.featureDays ?? null,
    categoryId: row.categoryIds[0] ? String(row.categoryIds[0]) : null,
    active: row.active,
  };
}

/** What customers can buy, in the order staff set. */
export async function listPackagesForSale() {
  await connectDb();
  const rows = await Package.find({ active: true })
    .sort({ kind: 1, order: 1, priceCents: 1 })
    .lean();
  return rows.map(toPackageDto);
}

type SubscriptionRow = SubscriptionFields & { _id: unknown };

function toCreditDto(row: SubscriptionRow) {
  return {
    id: String(row._id),
    name: row.name,
    kind: row.kind,
    total: row.total,
    remaining: row.remaining,
    expiresAt: row.expiresAt.toISOString(),
    featureDays: row.featureDays ?? null,
  };
}

/** The credits someone can still use, soonest to run out first. */
export async function myCredits(user: UserDoc) {
  await connectDb();
  await ensureFreeCredits(user._id);
  const rows = await Subscription.find({
    userId: user._id,
    remaining: { $gt: 0 },
    expiresAt: { $gt: new Date() },
  })
    .sort({ expiresAt: 1 })
    .lean();
  return rows.map(toCreditDto);
}

export async function myPayments(user: UserDoc) {
  await connectDb();
  const rows = await Payment.find({ userId: user._id, status: "paid" })
    .sort({ paidAt: -1 })
    .lean();
  return rows.map((row) => ({
    id: String(row._id),
    packageName: row.packageName,
    amountCents: row.amountCents,
    paidAt: row.paidAt!.toISOString(),
  }));
}

/** Turns a package into credits for a customer. */
export async function issueCredits(
  userId: Types.ObjectId,
  pkg: PackageRow,
  source: "purchase" | "grant",
  paymentId?: Types.ObjectId,
) {
  const now = Date.now();
  await Subscription.create({
    userId,
    packageId: pkg._id,
    name: pkg.name,
    kind: pkg.kind,
    categoryIds: pkg.categoryIds,
    featureDays: pkg.featureDays,
    total: pkg.quantity,
    remaining: pkg.quantity,
    expiresAt: new Date(now + pkg.days * DAY),
    source,
    ...(paymentId ? { paymentId } : {}),
  });
  await notify(userId, {
    kind: "package_ready",
    title:
      source === "grant"
        ? "A package was added for you"
        : "Your package is ready",
    body: `${pkg.name}: ${pkg.quantity} ${pkg.kind === "featured" ? "featured " : ""}${pkg.quantity === 1 ? "listing" : "listings"} to use in the next ${pkg.days} days.`,
    link: "/account/packages",
  });
}

export async function listPackages(actor: Actor) {
  authorize(actor, "packages.manage");
  await connectDb();

  const [rows, sold] = await Promise.all([
    Package.find().sort({ kind: 1, order: 1, priceCents: 1 }).lean(),
    Payment.aggregate<{ _id: unknown; count: number }>([
      { $match: { status: "paid" } },
      { $group: { _id: "$packageId", count: { $sum: 1 } } },
    ]),
  ]);
  const soldBy = new Map(sold.map((row) => [String(row._id), row.count]));
  return rows.map((row) => ({
    ...toPackageDto(row),
    sold: soldBy.get(String(row._id)) ?? 0,
  }));
}

export async function getPackage(actor: Actor, id: string) {
  authorize(actor, "packages.manage");
  await connectDb();
  const row = isObjectId(id) ? await Package.findById(id).lean() : null;
  if (!row) throw new AppError("not_found", "That package no longer exists.");
  return toPackageDto(row);
}

function fields(input: z.infer<typeof packageInput>) {
  const { categoryId, featureDays, ...rest } = input;
  return {
    ...rest,
    featureDays: input.kind === "featured" ? featureDays : undefined,
    categoryIds: categoryId ? [categoryId] : [],
  };
}

export async function createPackage(
  actor: Actor,
  input: z.infer<typeof packageInput>,
) {
  authorize(actor, "packages.manage");
  await connectDb();
  const row = await Package.create(fields(input));
  return row.id as string;
}

export async function updatePackage(
  actor: Actor,
  id: string,
  input: z.infer<typeof packageInput>,
) {
  authorize(actor, "packages.manage");
  await connectDb();
  // Credits already bought keep what they were bought with.
  const row = isObjectId(id)
    ? await Package.findByIdAndUpdate(id, fields(input))
    : null;
  if (!row) throw new AppError("not_found", "That package no longer exists.");
}

export const grantInput = z.object({
  packageId: z.string().refine(isObjectId, "Choose a package."),
  email: z.email("Enter the customer's email."),
});

/** Gives a customer a package without payment, as a favour or a fix. */
export async function grantPackage(
  actor: Actor,
  input: z.infer<typeof grantInput>,
) {
  authorize(actor, "packages.manage");
  await connectDb();

  const [pkg, customer] = await Promise.all([
    Package.findById(input.packageId).lean(),
    User.findOne({ email: input.email.toLowerCase() }),
  ]);
  if (!pkg) throw new AppError("not_found", "That package no longer exists.");
  if (!customer) {
    throw new AppError("validation", "No customer has that email.", {
      email: "No customer has that email.",
    });
  }

  await issueCredits(customer._id, pkg, "grant");
  await record(actor, {
    action: "package.granted",
    target: { kind: "package", id: pkg._id, label: pkg.name },
    note: `Given to ${customer.name}`,
  });
}

const PAGE_SIZE = 25;

export async function listPayments(actor: Actor, page = 1) {
  authorize(actor, "payments.view");
  await connectDb();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [rows, total, [month]] = await Promise.all([
    Payment.find({ status: "paid" })
      .sort({ paidAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    Payment.countDocuments({ status: "paid" }),
    Payment.aggregate<{ cents: number; count: number }>([
      { $match: { status: "paid", paidAt: { $gte: monthStart } } },
      {
        $group: {
          _id: null,
          cents: { $sum: "$amountCents" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);
  const people = await User.find({
    _id: { $in: rows.map((row) => row.userId) },
  }).lean();
  const byId = new Map(people.map((row) => [String(row._id), row]));

  return {
    total,
    page,
    pageSize: PAGE_SIZE,
    month: { cents: month?.cents ?? 0, count: month?.count ?? 0 },
    items: rows.map((row) => {
      const customer = byId.get(String(row.userId));
      return {
        id: String(row._id),
        packageName: row.packageName,
        amountCents: row.amountCents,
        paidAt: row.paidAt!.toISOString(),
        customer: customer
          ? { name: customer.name, email: customer.email }
          : null,
      };
    }),
  };
}
