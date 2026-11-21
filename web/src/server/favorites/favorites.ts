import "server-only";
import { connectDb } from "../db";
import { getPublicListing, listingCards } from "../listings/browse";
import type { UserDoc } from "../users/user.model";
import { Favorite } from "./favorite.model";

/** Saves a listing for later. Saving it twice changes nothing. */
export async function addFavorite(user: UserDoc, listingId: string) {
  // Only what is on the market can be saved; this throws for anything else.
  const listing = await getPublicListing(listingId);

  await Favorite.updateOne(
    { userId: user._id, listingId: listing.id },
    { $setOnInsert: { userId: user._id, listingId: listing.id } },
    { upsert: true },
  );
}

export async function removeFavorite(user: UserDoc, listingId: string) {
  await connectDb();
  await Favorite.deleteOne({ userId: user._id, listingId });
}

/**
 * The buyer's saved listings, latest save first. One that has sold or
 * expired since drops out of the list, and comes back if it is relisted.
 */
export async function listFavorites(user: UserDoc) {
  await connectDb();

  const saved = await Favorite.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .lean();
  const cards = await listingCards(saved.map((row) => row.listingId));

  return saved.flatMap((row) => cards.get(String(row.listingId)) ?? []);
}
