import "server-only";
import mongoose, { type InferSchemaType, type Model, Schema } from "mongoose";

const schema = new Schema(
  {
    reviewerId: { type: Schema.Types.ObjectId, required: true },
    sellerId: { type: Schema.Types.ObjectId, required: true },
    listingId: { type: Schema.Types.ObjectId, required: true },
    // Copied in, so a review still says what it was about after the listing
    // is gone.
    listingTitle: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    text: { type: String, default: "" },
    // Staff hide a review instead of deleting it, so it can come back.
    hidden: { type: Boolean, default: false, required: true },
  },
  { timestamps: true },
);

schema.index({ reviewerId: 1, listingId: 1 }, { unique: true });
schema.index({ sellerId: 1, hidden: 1, createdAt: -1 });
schema.index({ createdAt: -1 });

export type ReviewFields = InferSchemaType<typeof schema>;
export const Review: Model<ReviewFields> =
  mongoose.models.Review ?? mongoose.model("Review", schema);
