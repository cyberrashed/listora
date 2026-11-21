import "server-only";
import type { Types } from "mongoose";
import { AppError } from "../errors";
import { getSettings } from "../settings/settings";
import { Subscription } from "./package.model";

function monthOf(now: Date) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  return { key: start.toISOString().slice(0, 7), end };
}

/**
 * The month's free listings, as credits like any other. Created the first
 * time they are needed, once per account and month.
 */
export async function ensureFreeCredits(
  userId: Types.ObjectId,
  now = new Date(),
) {
  const month = monthOf(now);
  // A change in Settings counts from the month's first post on.
  const { freeListingsPerMonth } = await getSettings();
  try {
    await Subscription.updateOne(
      { userId, period: month.key },
      {
        $setOnInsert: {
          // Stands for "no package".
          packageId: "000000000000000000000000",
          name: "Free listings this month",
          kind: "listing",
          categoryIds: [],
          total: freeListingsPerMonth,
          remaining: freeListingsPerMonth,
          expiresAt: month.end,
          source: "free",
        },
      },
      { upsert: true },
    );
  } catch (error) {
    // Two requests created them at once; the other one won.
    if ((error as { code?: number }).code !== 11000) throw error;
  }
}

/**
 * Takes one credit of a kind that covers the category, the one that runs
 * out soonest first. One atomic update per try, so two posts at once can't
 * spend the same credit.
 */
export async function spendCredit(
  userId: Types.ObjectId,
  kind: "listing" | "featured",
  categoryPath: Types.ObjectId[],
  now = new Date(),
) {
  if (kind === "listing") await ensureFreeCredits(userId, now);

  const credit = await Subscription.findOneAndUpdate(
    {
      userId,
      kind,
      remaining: { $gt: 0 },
      expiresAt: { $gt: now },
      $or: [
        { categoryIds: { $size: 0 } },
        { categoryIds: { $in: categoryPath } },
      ],
    },
    { $inc: { remaining: -1 } },
    { sort: { expiresAt: 1 }, returnDocument: "after" },
  );
  if (!credit) {
    const { freeListingsPerMonth } = await getSettings();
    throw new AppError(
      "payment_required",
      kind === "featured"
        ? "Get a featured package to put this listing on top."
        : freeListingsPerMonth > 0
          ? `You've used your ${freeListingsPerMonth} free listings this month. Get a listing package to post more.`
          : "Get a listing package to post.",
    );
  }
  return credit;
}

/** Gives a credit back, when what it was spent on didn't happen. */
export async function refundCredit(creditId: Types.ObjectId) {
  await Subscription.updateOne({ _id: creditId }, { $inc: { remaining: 1 } });
}
