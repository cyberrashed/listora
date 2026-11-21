import "server-only";
import { z } from "zod";
import { Category } from "../categories/category.model";
import { connectDb, isObjectId } from "../db";
import { AppError } from "../errors";
import { photoUrl, toPhotoDto } from "../media/photos";
import { Place } from "../places/place.model";
import { EARTH_RADIUS_MILES } from "../places/places";
import { User } from "../users/user.model";
import type { AttributeValue } from "./attributes";
import { Listing, type ListingFields } from "./listing.model";

const PAGE_SIZE = 20;

const id = z.string().refine(isObjectId);

// One answer a buyer narrows by: any of some choices, a number range, or
// "yes" for a switch.
const narrowing = z.union([
  z.array(z.string()).min(1),
  z.object({ min: z.number().optional(), max: z.number().optional() }),
  z.literal(true),
]);

/** What a buyer can ask for, as it arrives in the query string. */
export const browseInput = z.object({
  q: z.string().trim().max(80).optional(),
  categoryId: id.optional(),
  placeId: id.optional(),
  radius: z.coerce.number().int().min(1).max(500).default(25),
  minCents: z.coerce.number().int().min(0).optional(),
  maxCents: z.coerce.number().int().min(0).optional(),
  // Field id to narrowing, as JSON, because a query string has no nesting.
  filters: z
    .string()
    .transform((text, context) => {
      try {
        return JSON.parse(text) as unknown;
      } catch {
        context.addIssue({ code: "custom", message: "Send filters as JSON." });
        return z.NEVER;
      }
    })
    .pipe(z.record(id, narrowing))
    .optional(),
  sort: z.enum(["newest", "price_low", "price_high"]).optional(),
  // Only what is featured right now, newest feature first.
  featured: z.literal("1").optional(),
  page: z.coerce.number().int().min(1).max(50).default(1),
});

export type BrowseQuery = z.infer<typeof browseInput>;

// What buyers can see: approved and still inside its 30 days.
const onTheMarket = () => ({
  status: "active" as const,
  expiresAt: { $gt: new Date() },
  sellerActive: true,
});

/**
 * The MongoDB filter and sort behind a page of results. Split from the fetch
 * so a test can ask the database how it plans to run them.
 */
export async function browsePlan(query: BrowseQuery) {
  await connectDb();

  const place = query.placeId
    ? await Place.findById(query.placeId).lean()
    : null;
  if (query.placeId && !place) {
    throw new AppError("validation", "Choose a location from the list.", {
      placeId: "Choose a location from the list.",
    });
  }

  const byPrice = query.sort === "price_low" || query.sort === "price_high";
  const cents = {
    // A listing without a price has no place in a price order.
    ...((query.minCents !== undefined || byPrice) && {
      $gte: query.minCents ?? 0,
    }),
    ...(query.maxCents !== undefined && { $lte: query.maxCents }),
  };

  const answers = Object.entries(query.filters ?? {}).map(
    ([fieldId, wanted]) => ({
      attributes: {
        $elemMatch: {
          fieldId,
          value: Array.isArray(wanted)
            ? { $in: wanted }
            : wanted === true
              ? true
              : {
                  ...(wanted.min !== undefined && { $gte: wanted.min }),
                  ...(wanted.max !== undefined && { $lte: wanted.max }),
                },
        },
      },
    }),
  );

  const filter = {
    ...onTheMarket(),
    ...(query.q && { $text: { $search: query.q } }),
    ...(query.categoryId && { categoryPath: query.categoryId }),
    ...(Object.keys(cents).length > 0 && { "price.cents": cents }),
    ...(place && {
      "location.point": {
        $geoWithin: {
          $centerSphere: [
            place.point.coordinates,
            query.radius / EARTH_RADIUS_MILES,
          ],
        },
      },
    }),
    ...(answers.length > 0 && { $and: answers }),
    ...(query.featured && { featuredUntil: { $gt: new Date() } }),
  };

  // The id breaks ties, so a listing never shows on two pages.
  const sort: Record<string, 1 | -1 | { $meta: "textScore" }> =
    query.sort === "price_low"
      ? { "price.cents": 1, _id: 1 }
      : query.sort === "price_high"
        ? { "price.cents": -1, _id: 1 }
        : query.featured
          ? { featuredUntil: -1, _id: 1 }
          : query.q && !query.sort
            ? { score: { $meta: "textScore" }, publishedAt: -1, _id: 1 }
            : { publishedAt: -1, _id: 1 };

  return { filter, sort };
}

type ListingRow = ListingFields & { _id: unknown };

// What a row of results shows. The exact point never leaves the server.
export function toListingCard(listing: ListingRow) {
  return {
    id: String(listing._id),
    title: listing.title,
    price: {
      mode: listing.price.mode,
      cents: listing.price.cents ?? null,
      maxCents: listing.price.maxCents ?? null,
    },
    // The cover. Listings saved before photos existed have no list at all.
    photo: listing.photoIds?.[0]
      ? photoUrl(listing.photoIds[0], "thumb")
      : null,
    city: listing.location.city,
    state: listing.location.state,
    publishedAt: listing.publishedAt!.toISOString(),
    featured: Boolean(
      listing.featuredUntil && listing.featuredUntil > new Date(),
    ),
  };
}

export async function browseListings(query: BrowseQuery) {
  const { filter, sort } = await browsePlan(query);

  const [rows, total] = await Promise.all([
    Listing.find(filter)
      .sort(sort)
      .skip((query.page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    Listing.countDocuments(filter),
  ]);

  return {
    items: rows.map(toListingCard),
    total,
    page: query.page,
    pageSize: PAGE_SIZE,
  };
}

/** The cards for some listings, keeping only those still on the market. */
export async function listingCards(ids: unknown[]) {
  const rows = await Listing.find({
    _id: { $in: ids },
    ...onTheMarket(),
  }).lean();
  return new Map(rows.map((row) => [String(row._id), toListingCard(row)]));
}

/** A listing as any buyer sees it. Anything not on the market is missing. */
export async function getPublicListing(listingId: string) {
  await connectDb();

  const listing = isObjectId(listingId)
    ? await Listing.findOne({ _id: listingId, ...onTheMarket() }).lean()
    : null;
  const seller = listing && (await User.findById(listing.sellerId).lean());
  if (!listing || !seller) {
    throw new AppError("not_found", "That listing is no longer available.");
  }

  const categories = await Category.find({
    _id: { $in: listing.categoryPath },
  }).lean();
  const names = new Map(categories.map((row) => [String(row._id), row.name]));

  return {
    ...toListingCard(listing),
    photos: (listing.photoIds ?? []).map(toPhotoDto),
    description: listing.description,
    category: {
      id: String(listing.categoryId),
      // Root first, ending with the listing's own category.
      path: listing.categoryPath.map((id) => names.get(String(id)) ?? ""),
    },
    attributes: listing.attributes.map((attribute) => ({
      fieldId: String(attribute.fieldId),
      label: attribute.label,
      unit: attribute.unit ?? null,
      value: attribute.value as AttributeValue,
    })),
    seller: {
      id: String(seller._id),
      name: seller.name,
      joinedAt: seller.createdAt.toISOString(),
      verified: seller.verified,
      rating: { average: seller.ratingAverage, count: seller.ratingCount },
      // Only when the seller chose to show it on this listing.
      phone: listing.showPhone ? (seller.phone ?? null) : null,
    },
  };
}
