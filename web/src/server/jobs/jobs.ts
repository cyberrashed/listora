import "server-only";
import { connectDb } from "../db";
import { sendEmail } from "../emails/emails";
import { transition } from "../listings/lifecycle";
import { Listing } from "../listings/listing.model";
import { removeUnusedPhotos } from "../media/photos";
import { notify } from "../notifications/notifications";
import { Payment } from "../packages/package.model";
import { User } from "../users/user.model";

const DAY = 86_400_000;
const WARN_DAYS = 3;

/**
 * The work that runs on a schedule. Safe to run as often as you like: each
 * step only touches what is due and marks it done.
 */
export async function runScheduledJobs(now = new Date()) {
  await connectDb();

  // Listings whose 30 days are up leave the market.
  const expire = transition("expire");
  const ended = await Listing.find({
    status: { $in: expire.from },
    expiresAt: { $lte: now },
  }).lean();
  await Listing.updateMany(
    { _id: { $in: ended.map((row) => row._id) }, status: { $in: expire.from } },
    { status: expire.to },
  );
  for (const listing of ended) {
    await notify(listing.sellerId, {
      kind: "listing_expired",
      title: "Your listing ended",
      body: `“${listing.title}” ran its 30 days. Renew it to put it back up.`,
      link: `/selling/${String(listing._id)}`,
    });
    const seller = await User.findById(listing.sellerId).lean();
    if (seller) {
      await sendEmail({
        to: seller.email,
        kind: "listing_expired",
        subject: `“${listing.title}” has ended`,
        body: "Your listing ran its 30 days and is no longer shown to buyers. Renew it from the Selling tab.",
      });
    }
  }

  // A heads-up a few days before, once.
  const ending = await Listing.find({
    status: "active",
    expiresAt: { $gt: now, $lte: new Date(now.getTime() + WARN_DAYS * DAY) },
    expiryWarnedAt: null,
  }).lean();
  await Listing.updateMany(
    { _id: { $in: ending.map((row) => row._id) } },
    { expiryWarnedAt: now },
  );
  for (const listing of ending) {
    const days = Math.ceil(
      (listing.expiresAt!.getTime() - now.getTime()) / DAY,
    );
    await notify(listing.sellerId, {
      kind: "listing_expiring",
      title: "Your listing ends soon",
      body: `“${listing.title}” comes down in ${days} ${days === 1 ? "day" : "days"}.`,
      link: `/selling/${String(listing._id)}`,
    });
  }

  // Checkouts nobody finished in a day are let go.
  const abandoned = await Payment.updateMany(
    { status: "pending", createdAt: { $lte: new Date(now.getTime() - DAY) } },
    { status: "expired" },
  );

  // Photos uploaded for a listing that was never posted.
  const unusedPhotos = await removeUnusedPhotos(new Date(now.getTime() - DAY));

  return {
    expired: ended.length,
    warned: ending.length,
    abandonedPayments: abandoned.modifiedCount,
    unusedPhotos,
  };
}
