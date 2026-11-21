import "server-only";
import type { Types } from "mongoose";
import { z } from "zod";
import { record } from "../activity/activity";
import { Conversation } from "../chat/chat.model";
import { connectDb, isObjectId } from "../db";
import { AppError } from "../errors";
import { Listing } from "../listings/listing.model";
import { notify } from "../notifications/notifications";
import { type Actor, authorize } from "../staff/authorize";
import { User, type UserDoc } from "../users/user.model";
import { Review, type ReviewFields } from "./review.model";

export const reviewInput = z.object({
  listingId: z.string().refine(isObjectId, "Choose a listing."),
  rating: z
    .number()
    .int()
    .min(1, "Choose from one to five stars.")
    .max(5, "Choose from one to five stars."),
  text: z.string().trim().max(500, "Keep it under 500 characters."),
});

/** Brings a seller's stored rating in line with their visible reviews. */
export async function refreshRating(sellerId: Types.ObjectId) {
  const [stats] = await Review.aggregate<{ average: number; count: number }>([
    { $match: { sellerId, hidden: false } },
    {
      $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } },
    },
  ]);
  await User.updateOne(
    { _id: sellerId },
    {
      ratingAverage: stats ? Math.round(stats.average * 10) / 10 : 0,
      ratingCount: stats?.count ?? 0,
    },
  );
}

/**
 * The listings a buyer may still review this seller for: ones they talked
 * to the seller about and haven't reviewed yet.
 */
export async function reviewableListings(
  buyerId: Types.ObjectId,
  sellerId: Types.ObjectId,
) {
  const conversations = await Conversation.find({
    buyerId,
    sellerId,
    lastMessage: { $exists: true },
  }).lean();
  const done = await Review.find({
    reviewerId: buyerId,
    listingId: { $in: conversations.map((row) => row.listingId) },
  }).distinct("listingId");
  const reviewed = new Set(done.map(String));

  const listings = await Listing.find({
    _id: {
      $in: conversations
        .map((row) => row.listingId)
        .filter((id) => !reviewed.has(String(id))),
    },
  }).lean();
  return listings.map((row) => ({ id: String(row._id), title: row.title }));
}

export async function writeReview(
  reviewer: UserDoc,
  input: z.infer<typeof reviewInput>,
) {
  await connectDb();

  const listing = await Listing.findById(input.listingId).lean();
  if (!listing) {
    throw new AppError("not_found", "That listing no longer exists.");
  }
  const open = await reviewableListings(reviewer._id, listing.sellerId);
  if (!open.some((row) => row.id === input.listingId)) {
    throw new AppError(
      "forbidden",
      "You can review a seller once you've talked with them about a listing, and once per listing.",
    );
  }

  const review = await Review.create({
    reviewerId: reviewer._id,
    sellerId: listing.sellerId,
    listingId: listing._id,
    listingTitle: listing.title,
    rating: input.rating,
    text: input.text,
  });
  await refreshRating(listing.sellerId);
  await notify(listing.sellerId, {
    kind: "review_received",
    title: "New review",
    body: `${reviewer.name} gave you ${input.rating} out of 5 for “${listing.title}”.`,
    link: `/sellers/${String(listing.sellerId)}`,
  });
  return toPublicReview(review, reviewer.name);
}

type ReviewRow = ReviewFields & { _id: unknown };

function toPublicReview(review: ReviewRow, reviewerName: string) {
  return {
    id: String(review._id),
    rating: review.rating,
    text: review.text,
    reviewerName,
    listingTitle: review.listingTitle,
    createdAt: review.createdAt.toISOString(),
  };
}

/** A seller's visible reviews, newest first. */
export async function sellerReviews(sellerId: Types.ObjectId, limit = 20) {
  const rows = await Review.find({ sellerId, hidden: false })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  const names = await namesOf(rows.map((row) => row.reviewerId));
  return rows.map((row) =>
    toPublicReview(row, names.get(String(row.reviewerId)) ?? "Former member"),
  );
}

async function namesOf(ids: Types.ObjectId[]) {
  const people = await User.find({ _id: { $in: ids } }).lean();
  return new Map(people.map((row) => [String(row._id), row.name]));
}

const PAGE_SIZE = 25;

export async function listReviews(
  actor: Actor,
  { hidden = false, page = 1 }: { hidden?: boolean; page?: number },
) {
  authorize(actor, "reviews.moderate");
  await connectDb();

  const filter = { hidden };
  const [rows, total, hiddenCount] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    Review.countDocuments(filter),
    Review.countDocuments({ hidden: true }),
  ]);
  const names = await namesOf(
    rows.flatMap((row) => [row.reviewerId, row.sellerId]),
  );

  return {
    total,
    page,
    pageSize: PAGE_SIZE,
    hiddenCount,
    items: rows.map((row) => ({
      ...toPublicReview(
        row,
        names.get(String(row.reviewerId)) ?? "Former member",
      ),
      sellerName: names.get(String(row.sellerId)) ?? "Former member",
      hidden: row.hidden,
    })),
  };
}

export async function setReviewHidden(
  actor: Actor,
  id: string,
  hidden: boolean,
  note?: string,
) {
  authorize(actor, "reviews.moderate");
  await connectDb();

  const review = isObjectId(id) ? await Review.findById(id) : null;
  if (!review) throw new AppError("not_found", "That review no longer exists.");
  if (review.hidden === hidden) return;

  review.hidden = hidden;
  await review.save();
  await refreshRating(review.sellerId);
  await record(actor, {
    action: hidden ? "review.hidden" : "review.restored",
    target: {
      kind: "review",
      id: review._id,
      label: `${review.rating} of 5 stars on “${review.listingTitle}”`,
    },
    note,
  });
}
