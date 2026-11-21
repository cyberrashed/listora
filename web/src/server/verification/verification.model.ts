import "server-only";
import mongoose, { type InferSchemaType, type Model, Schema } from "mongoose";

const schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    legalName: { type: String, required: true },
    phone: { type: String, required: true },
    // What and how they sell, in their words.
    about: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      required: true,
    },
    // Why it was turned down; the person reads it.
    reason: String,
    decidedBy: String,
    decidedAt: Date,
  },
  { timestamps: true },
);

schema.index({ status: 1, createdAt: 1 });
schema.index({ userId: 1, createdAt: -1 });

export type VerificationFields = InferSchemaType<typeof schema>;
export const Verification: Model<VerificationFields> =
  mongoose.models.Verification ?? mongoose.model("Verification", schema);
