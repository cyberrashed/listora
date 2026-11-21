import "server-only";
import mongoose, {
  type HydratedDocument,
  type InferSchemaType,
  type Model,
  Schema,
} from "mongoose";
import { listingStatuses } from "./lifecycle";

export const priceModes = [
  "fixed",
  "range",
  "negotiable",
  "on_request",
  "free",
] as const;

// Money is whole cents. `maxCents` is the top of a range. A free listing
// stores 0 so it sorts first by price; one priced on request stores nothing.
const priceSchema = new Schema(
  {
    mode: { type: String, enum: priceModes, required: true },
    cents: Number,
    maxCents: Number,
  },
  { _id: false },
);

// A snapshot of the field at the time of posting, with the seller's answer.
const attributeSchema = new Schema(
  {
    fieldId: { type: Schema.Types.ObjectId, required: true },
    label: { type: String, required: true },
    unit: String,
    value: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const locationSchema = new Schema(
  {
    // The place the seller picked, kept so an edit can start from it.
    placeId: { type: Schema.Types.ObjectId, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: String,
    // GeoJSON, longitude first. Never sent to other customers as is.
    point: {
      type: new Schema(
        {
          type: { type: String, enum: ["Point"], required: true },
          coordinates: { type: [Number], required: true },
        },
        { _id: false },
      ),
      required: true,
    },
  },
  { _id: false },
);

const schema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    categoryId: { type: Schema.Types.ObjectId, required: true },
    // The category and everything above it, root first, so a listing is
    // found under any of its ancestors with one indexed match.
    categoryPath: { type: [Schema.Types.ObjectId], required: true },
    price: { type: priceSchema, required: true },
    attributes: { type: [attributeSchema], default: [] },
    // In the seller's order. The first is the cover.
    photoIds: { type: [Schema.Types.ObjectId], default: [] },
    location: { type: locationSchema, required: true },
    showPhone: { type: Boolean, default: false, required: true },
    // False while the seller's account is suspended: their listings leave
    // the market without losing their own status.
    sellerActive: { type: Boolean, default: true, required: true },
    status: { type: String, enum: listingStatuses, required: true },
    rejection: {
      type: new Schema(
        {
          kind: { type: String, enum: ["soft", "permanent"], required: true },
          reason: { type: String, required: true },
        },
        { _id: false },
      ),
    },
    // When it entered the review queue. Reset each time it is revised.
    submittedAt: { type: Date, required: true },
    publishedAt: Date,
    expiresAt: Date,
    // On top of the market until then.
    featuredUntil: Date,
    // When the seller was told it ends soon, so they are told once.
    expiryWarnedAt: Date,
  },
  { timestamps: true },
);

schema.index({ status: 1, submittedAt: 1 });
schema.index({ sellerId: 1, createdAt: -1 });
// Browsing: newest or by price, across the market or inside a category.
schema.index({ status: 1, publishedAt: -1 });
schema.index({ status: 1, "price.cents": 1 });
schema.index({ status: 1, categoryPath: 1, publishedAt: -1 });
schema.index({ status: 1, categoryPath: 1, "price.cents": 1 });
schema.index({ "location.point": "2dsphere" });
schema.index({ status: 1, featuredUntil: -1 });
schema.index({ status: 1, expiresAt: 1 });
// A word in the title counts for more than one in the description.
schema.index(
  { title: "text", description: "text" },
  { weights: { title: 5, description: 1 } },
);

export type ListingFields = InferSchemaType<typeof schema>;
export type ListingDoc = HydratedDocument<ListingFields>;
export const Listing: Model<ListingFields> =
  mongoose.models.Listing ?? mongoose.model("Listing", schema);
