import "server-only";
import { connectDb, isObjectId } from "../db";
import { AppError } from "../errors";
import { toListingCard } from "../listings/browse";
import { Listing } from "../listings/listing.model";
import { reviewableListings, sellerReviews } from "../reviews/reviews";
import { Follow } from "../social/social.model";
import { User, type UserDoc } from "../users/user.model";

/**
 * A seller as anyone sees them. A signed-in viewer also learns whether they
 * follow the seller and which listings they may still review them for.
 */
export async function getSellerProfile(
  viewer: UserDoc | null,
  sellerId: string,
) {
  await connectDb();

  const seller = isObjectId(sellerId)
    ? await User.findById(sellerId).lean()
    : null;
  if (!seller || seller.status !== "active") {
    throw new AppError("not_found", "That seller isn't on Listora.");
  }

  const [listings, reviews, followers, following, reviewable] =
    await Promise.all([
      Listing.find({
        sellerId: seller._id,
        status: "active",
        expiresAt: { $gt: new Date() },
      })
        .sort({ publishedAt: -1 })
        .limit(50)
        .lean(),
      sellerReviews(seller._id),
      Follow.countDocuments({ sellerId: seller._id }),
      viewer
        ? Follow.exists({ followerId: viewer._id, sellerId: seller._id })
        : null,
      viewer && !viewer._id.equals(seller._id)
        ? reviewableListings(viewer._id, seller._id)
        : [],
    ]);

  return {
    id: String(seller._id),
    name: seller.name,
    joinedAt: seller.createdAt.toISOString(),
    verified: seller.verified,
    rating: { average: seller.ratingAverage, count: seller.ratingCount },
    followers,
    following: Boolean(following),
    listings: listings.map(toListingCard),
    reviews,
    reviewable,
  };
}
