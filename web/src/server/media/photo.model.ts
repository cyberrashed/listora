import "server-only";
import mongoose, { type InferSchemaType, type Model, Schema } from "mongoose";

// A photo is uploaded before its listing exists, so it starts unattached.
// Posting the listing claims it. Photos nobody claims are cleared by the
// scheduled job.
const schema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, required: true },
    listingId: Schema.Types.ObjectId,
  },
  { timestamps: true },
);

schema.index({ listingId: 1, createdAt: 1 });
schema.index({ ownerId: 1 });

export type PhotoFields = InferSchemaType<typeof schema>;
export const Photo: Model<PhotoFields> =
  mongoose.models.Photo ?? mongoose.model("Photo", schema);
