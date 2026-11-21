import "server-only";
import mongoose, { type InferSchemaType, type Model, Schema } from "mongoose";

const schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    listingId: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// One save per buyer and listing; also serves "this buyer's saves".
schema.index({ userId: 1, listingId: 1 }, { unique: true });

export type FavoriteFields = InferSchemaType<typeof schema>;
export const Favorite: Model<FavoriteFields> =
  mongoose.models.Favorite ?? mongoose.model("Favorite", schema);
