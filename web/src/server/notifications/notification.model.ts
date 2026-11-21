import "server-only";
import mongoose, { type InferSchemaType, type Model, Schema } from "mongoose";

export const notificationKinds = [
  "listing_approved",
  "listing_rejected",
  "offer_received",
  "offer_answered",
  "review_received",
  "report_resolved",
  "verification_decided",
  "package_ready",
  "listing_expiring",
  "listing_expired",
  "announcement",
] as const;

const schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    kind: { type: String, enum: notificationKinds, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    // Where tapping it goes in the app, like "/selling/<id>".
    link: String,
    readAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

schema.index({ userId: 1, createdAt: -1 });

export type NotificationFields = InferSchemaType<typeof schema>;
export const Notification: Model<NotificationFields> =
  mongoose.models.Notification ?? mongoose.model("Notification", schema);
