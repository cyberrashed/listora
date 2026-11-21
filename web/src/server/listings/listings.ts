import "server-only";
import type { Types } from "mongoose";
import { z } from "zod";
import { record } from "../activity/activity";
import { Category } from "../categories/category.model";
import { fieldsForCategory } from "../categories/custom-fields";
import { connectDb, isObjectId } from "../db";
import { sendEmail } from "../emails/emails";
import { AppError } from "../errors";
import {
  attachPhotos,
  checkPhotos,
  deletePhotos,
  MAX_PHOTOS,
  toPhotoDto,
} from "../media/photos";
import { notify } from "../notifications/notifications";
import { refundCredit, spendCredit } from "../packages/credits";
import { Place } from "../places/place.model";
import { type Actor, authorize } from "../staff/authorize";
import { User, type UserDoc } from "../users/user.model";
import { type AttributeValue, resolveAttributes } from "./attributes";
import { type ListingStatus, listingStatuses, nextStatus } from "./lifecycle";
import { Listing, type ListingDoc } from "./listing.model";

const LISTING_DAYS = 30;
const MAX_CENTS = 10_000_000_00;

const cents = z
  .number()
  .int()
  .positive("Enter a price.")
  .max(MAX_CENTS, "That price is too high.");

const price = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("fixed"), cents }),
  z.object({ mode: z.literal("negotiable"), cents }),
  z
    .object({ mode: z.literal("range"), cents, maxCents: cents })
    .refine((range) => range.maxCents > range.cents, {
      path: ["maxCents"],
      message: "The top of the range must be higher than the bottom.",
    }),
  z.object({ mode: z.literal("on_request") }),
  z.object({ mode: z.literal("free") }),
]);

export const listingInput = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Use at least 5 characters.")
    .max(80, "Use 80 characters or fewer."),
  description: z
    .string()
    .trim()
    .min(20, "Say a little more: at least 20 characters.")
    .max(4000, "Use 4,000 characters or fewer."),
  categoryId: z.string().refine(isObjectId, "Choose a category."),
  price,
  attributes: z.record(z.string(), z.unknown()),
  placeId: z.string().refine(isObjectId, "Choose a location."),
  showPhone: z.boolean(),
  photoIds: z
    .array(z.string())
    .max(MAX_PHOTOS, `Use ${MAX_PHOTOS} photos or fewer.`)
    .default([]),
});

export const rejectionInput = z.object({
  kind: z.enum(["soft", "permanent"]),
  reason: z
    .string()
    .trim()
    .min(5, "Tell the seller why.")
    .max(300, "Use 300 characters or fewer."),
});

// What callers may send: the photo list can be left out.
type ListingInput = z.input<typeof listingInput>;

const notFound = () =>
  new AppError("not_found", "That listing no longer exists.");

async function findListing(id: string) {
  const listing = isObjectId(id) ? await Listing.findById(id) : null;
  if (!listing) throw notFound();
  return listing;
}

async function findOwnListing(seller: UserDoc, id: string) {
  const listing = await findListing(id);
  // Someone else's listing is reported as missing, not as forbidden.
  if (!listing.sellerId.equals(seller._id)) throw notFound();
  return listing;
}

// Everything a listing takes from its category, place and seller's answers.
async function resolve(input: ListingInput) {
  const category = await Category.findById(input.categoryId).lean();
  const path = category ? [...category.ancestors, category._id] : [];
  const visible =
    category &&
    (await Category.countDocuments({ _id: { $in: path }, active: true })) ===
      path.length;
  if (!category || !visible) {
    throw new AppError("validation", "Choose a category.", {
      categoryId: "That category is no longer available.",
    });
  }
  if (await Category.exists({ parentId: category._id })) {
    throw new AppError("validation", "Choose a category.", {
      categoryId: "Choose a more specific category.",
    });
  }

  const place = await Place.findById(input.placeId).lean();
  if (!place) {
    throw new AppError("validation", "Choose a location.", {
      placeId: "Choose a location from the list.",
    });
  }

  return {
    title: input.title,
    description: input.description,
    categoryId: category._id,
    categoryPath: path,
    price:
      input.price.mode === "free"
        ? { mode: "free" as const, cents: 0 }
        : input.price,
    attributes: resolveAttributes(
      await fieldsForCategory(input.categoryId),
      input.attributes,
    ),
    location: {
      placeId: place._id,
      city: place.city,
      state: place.state,
      zip: place.zip,
      point: place.point,
    },
    showPhone: input.showPhone,
  };
}

async function categoryNames(listings: ListingDoc[]) {
  const ids = listings.flatMap((listing) => listing.categoryPath);
  const categories = await Category.find({ _id: { $in: ids } }).lean();
  return new Map(categories.map((row) => [String(row._id), row.name]));
}

function toListingDto(listing: ListingDoc, names: Map<string, string>) {
  return {
    id: listing.id as string,
    title: listing.title,
    description: listing.description,
    status: listing.status,
    rejection: listing.rejection
      ? { kind: listing.rejection.kind, reason: listing.rejection.reason }
      : null,
    price: {
      mode: listing.price.mode,
      cents: listing.price.cents ?? null,
      maxCents: listing.price.maxCents ?? null,
    },
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
    photos: listing.photoIds.map(toPhotoDto),
    // The city is public. The exact point never leaves the server.
    location: {
      placeId: String(listing.location.placeId),
      city: listing.location.city,
      state: listing.location.state,
      zip: listing.location.zip ?? null,
    },
    showPhone: listing.showPhone,
    submittedAt: listing.submittedAt.toISOString(),
    publishedAt: listing.publishedAt?.toISOString() ?? null,
    expiresAt: listing.expiresAt?.toISOString() ?? null,
    featuredUntil:
      listing.featuredUntil && listing.featuredUntil > new Date()
        ? listing.featuredUntil.toISOString()
        : null,
  };
}

export type ListingDto = ReturnType<typeof toListingDto>;

async function toDtos(listings: ListingDoc[]) {
  const names = await categoryNames(listings);
  return listings.map((listing) => toListingDto(listing, names));
}

/**
 * Posts a listing for review. It takes one listing credit: a free one while
 * the month's last, otherwise one from a package.
 */
export async function createListing(seller: UserDoc, input: ListingInput) {
  await connectDb();

  const resolved = await resolve(input);
  const photoIds = await checkPhotos(seller, input.photoIds ?? []);
  const credit = await spendCredit(
    seller._id,
    "listing",
    resolved.categoryPath,
  );
  try {
    const listing = await Listing.create({
      ...resolved,
      photoIds,
      sellerId: seller._id,
      status: "in_review",
      submittedAt: new Date(),
    });
    await attachPhotos(listing._id, photoIds);
    return (await toDtos([listing]))[0];
  } catch (error) {
    await refundCredit(credit._id);
    throw error;
  }
}

/** Puts an expired listing back up for another 30 days, for a credit. */
export async function renewListing(seller: UserDoc, id: string) {
  await connectDb();

  const listing = await findOwnListing(seller, id);
  const status = nextStatus(listing, "renew");
  const credit = await spendCredit(seller._id, "listing", listing.categoryPath);

  listing.status = status;
  listing.expiresAt = new Date(Date.now() + LISTING_DAYS * 86_400_000);
  listing.expiryWarnedAt = undefined;
  await saveOrRefund(listing, credit._id);
  return (await toDtos([listing]))[0];
}

/** Puts a live listing on top of the market, for a featured credit. */
export async function featureListing(seller: UserDoc, id: string) {
  await connectDb();

  const listing = await findOwnListing(seller, id);
  if (listing.status !== "active") {
    throw new AppError("conflict", "Only a live listing can be featured.");
  }
  const credit = await spendCredit(
    seller._id,
    "featured",
    listing.categoryPath,
  );

  // Featuring again adds to what is left.
  const from = Math.max(Date.now(), listing.featuredUntil?.getTime() ?? 0);
  listing.featuredUntil = new Date(
    from + (credit.featureDays ?? 7) * 86_400_000,
  );
  await saveOrRefund(listing, credit._id);
  return (await toDtos([listing]))[0];
}

// A credit is only used up once the change it paid for is saved.
async function saveOrRefund(listing: ListingDoc, creditId: Types.ObjectId) {
  try {
    await listing.save();
  } catch (error) {
    await refundCredit(creditId);
    throw error;
  }
}

export async function reviseListing(
  seller: UserDoc,
  id: string,
  input: ListingInput,
) {
  await connectDb();

  const listing = await findOwnListing(seller, id);
  const status = nextStatus(listing, "revise");
  const photoIds = await checkPhotos(seller, input.photoIds ?? [], listing._id);
  const removed = listing.photoIds.filter(
    (old) => !photoIds.some((kept) => kept.equals(old)),
  );

  listing.set({
    ...(await resolve(input)),
    photoIds,
    status,
    rejection: undefined,
    submittedAt: new Date(),
  });
  await listing.save();
  await attachPhotos(listing._id, photoIds);
  await deletePhotos(removed);
  return (await toDtos([listing]))[0];
}

export async function markListingSold(seller: UserDoc, id: string) {
  await connectDb();

  const listing = await findOwnListing(seller, id);
  listing.status = nextStatus(listing, "markSold");
  await listing.save();
  return (await toDtos([listing]))[0];
}

export async function deleteListing(seller: UserDoc, id: string) {
  await connectDb();
  const listing = await findOwnListing(seller, id);
  await listing.deleteOne();
  await deletePhotos(listing.photoIds);
}

export async function listOwnListings(seller: UserDoc) {
  await connectDb();
  return toDtos(
    await Listing.find({ sellerId: seller._id }).sort({ createdAt: -1 }),
  );
}

const PAGE_SIZE = 25;

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function withSellers(listings: ListingDoc[]) {
  const [dtos, sellers] = await Promise.all([
    toDtos(listings),
    User.find({ _id: { $in: listings.map((row) => row.sellerId) } }).lean(),
  ]);
  const byId = new Map(sellers.map((seller) => [String(seller._id), seller]));

  return dtos.map((dto, index) => {
    const seller = byId.get(String(listings[index].sellerId));
    return {
      ...dto,
      seller: seller
        ? {
            id: String(seller._id),
            name: seller.name,
            email: seller.email,
            phone: seller.phone ?? null,
            joinedAt: seller.createdAt.toISOString(),
          }
        : null,
    };
  });
}

export async function listListings(
  actor: Actor,
  {
    status,
    query = "",
    page = 1,
  }: { status?: ListingStatus; query?: string; page?: number },
) {
  authorize(actor, "listings.review");
  await connectDb();

  const term = query.trim();
  const filter = {
    ...(status && { status }),
    ...(term && { title: { $regex: escapeRegex(term), $options: "i" } }),
  };

  const [listings, total, grouped] = await Promise.all([
    Listing.find(filter)
      // The review queue is worked oldest first; everything else newest first.
      .sort({ submittedAt: status === "in_review" ? 1 : -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE),
    Listing.countDocuments(filter),
    Listing.aggregate<{ _id: ListingStatus; count: number }>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const counts = Object.fromEntries(
    listingStatuses.map((name) => [
      name,
      grouped.find((group) => group._id === name)?.count ?? 0,
    ]),
  ) as Record<ListingStatus, number>;

  return {
    items: await withSellers(listings),
    total,
    page,
    pageSize: PAGE_SIZE,
    counts,
  };
}

export async function getListing(actor: Actor, id: string) {
  authorize(actor, "listings.review");
  await connectDb();
  return (await withSellers([await findListing(id)]))[0];
}

async function emailSeller(
  listing: ListingDoc,
  kind: "listing_approved" | "listing_rejected",
  subject: string,
  body: string,
) {
  const seller = await User.findById(listing.sellerId).lean();
  if (seller) await sendEmail({ to: seller.email, kind, subject, body });
}

export async function approveListing(actor: Actor, id: string) {
  authorize(actor, "listings.review");
  await connectDb();

  const listing = await findListing(id);
  listing.status = nextStatus(listing, "approve");

  const now = new Date();
  listing.publishedAt ??= now;
  listing.expiresAt = new Date(now.getTime() + LISTING_DAYS * 86_400_000);
  await listing.save();

  await emailSeller(
    listing,
    "listing_approved",
    `“${listing.title}” is live`,
    `Your listing is on Listora for the next ${LISTING_DAYS} days.`,
  );
  await record(actor, {
    action: "listing.approved",
    target: { kind: "listing", id: listing._id, label: listing.title },
  });
  await notify(listing.sellerId, {
    kind: "listing_approved",
    title: "Your listing is live",
    body: `“${listing.title}” is on Listora for the next ${LISTING_DAYS} days.`,
    link: `/selling/${listing.id as string}`,
  });
}

export async function rejectListing(
  actor: Actor,
  id: string,
  rejection: z.infer<typeof rejectionInput>,
) {
  authorize(actor, "listings.review");
  await connectDb();

  const listing = await findListing(id);
  listing.status = nextStatus(listing, "reject");
  listing.rejection = rejection;
  await listing.save();

  await emailSeller(
    listing,
    "listing_rejected",
    `“${listing.title}” was not approved`,
    // The reason goes last: staff don't always end it with a full stop.
    rejection.kind === "soft"
      ? `Edit the listing and send it in again. Reason: ${rejection.reason}`
      : `This listing can't be posted again. Reason: ${rejection.reason}`,
  );
  await record(actor, {
    action: "listing.rejected",
    target: { kind: "listing", id: listing._id, label: listing.title },
    note: `${rejection.kind === "soft" ? "Can be fixed" : "Final"}: ${rejection.reason}`,
  });
  await notify(listing.sellerId, {
    kind: "listing_rejected",
    title: "Your listing wasn't approved",
    body: `“${listing.title}”: ${rejection.reason}`,
    link: `/selling/${listing.id as string}`,
  });
}
