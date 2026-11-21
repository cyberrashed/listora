import "server-only";
import mongoose, { type InferSchemaType, type Model, Schema } from "mongoose";

const followSchema = new Schema(
  {
    followerId: { type: Schema.Types.ObjectId, required: true },
    sellerId: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
followSchema.index({ followerId: 1, sellerId: 1 }, { unique: true });
followSchema.index({ sellerId: 1 });

export const Follow: Model<InferSchemaType<typeof followSchema>> =
  mongoose.models.Follow ?? mongoose.model("Follow", followSchema);

const blockSchema = new Schema(
  {
    blockerId: { type: Schema.Types.ObjectId, required: true },
    blockedId: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
blockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });
blockSchema.index({ blockedId: 1 });

export const Block: Model<InferSchemaType<typeof blockSchema>> =
  mongoose.models.Block ?? mongoose.model("Block", blockSchema);
