import "server-only";
import mongoose, { type InferSchemaType, type Model, Schema } from "mongoose";

const schema = new Schema(
  {
    to: { type: String, required: true },
    kind: {
      type: String,
      enum: [
        "welcome",
        "password_reset",
        "listing_approved",
        "listing_rejected",
        "listing_expired",
        "receipt",
      ],
      required: true,
    },
    subject: { type: String, required: true },
    body: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

schema.index({ createdAt: -1 });

export type EmailFields = InferSchemaType<typeof schema>;
export const Email: Model<EmailFields> =
  mongoose.models.Email ?? mongoose.model("Email", schema);
