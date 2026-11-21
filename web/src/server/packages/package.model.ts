import "server-only";
import mongoose, { type InferSchemaType, type Model, Schema } from "mongoose";

export const packageKinds = ["listing", "featured"] as const;

// What can be bought: a number of listings to post, or of listings to
// feature, usable for a number of days after purchase.
const packageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    kind: { type: String, enum: packageKinds, required: true },
    priceCents: { type: Number, min: 0, required: true },
    quantity: { type: Number, min: 1, required: true },
    // How long the credits last once bought.
    days: { type: Number, min: 1, required: true },
    // For featured packages: how long each featured listing stays on top.
    featureDays: { type: Number, min: 1 },
    // Empty for every category; otherwise the tree under these.
    categoryIds: { type: [Schema.Types.ObjectId], default: [] },
    active: { type: Boolean, default: true, required: true },
    order: { type: Number, default: 0, required: true },
  },
  { timestamps: true },
);

export type PackageFields = InferSchemaType<typeof packageSchema>;
export const Package: Model<PackageFields> =
  mongoose.models.Package ?? mongoose.model("Package", packageSchema);

// Credits a customer holds from one package, bought or given.
const subscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    packageId: { type: Schema.Types.ObjectId, required: true },
    // Copied in so the credits keep working if the package is changed.
    name: { type: String, required: true },
    kind: { type: String, enum: packageKinds, required: true },
    categoryIds: { type: [Schema.Types.ObjectId], default: [] },
    featureDays: Number,
    total: { type: Number, required: true },
    remaining: { type: Number, min: 0, required: true },
    expiresAt: { type: Date, required: true },
    source: {
      type: String,
      enum: ["purchase", "grant", "free"],
      required: true,
    },
    paymentId: Schema.Types.ObjectId,
    // The month free credits belong to, like "2026-11".
    period: String,
  },
  { timestamps: true },
);

subscriptionSchema.index({ userId: 1, kind: 1, expiresAt: 1 });
subscriptionSchema.index(
  { userId: 1, period: 1 },
  { unique: true, partialFilterExpression: { period: { $exists: true } } },
);
// A payment is turned into credits once, however often Stripe says so.
subscriptionSchema.index(
  { paymentId: 1 },
  { unique: true, partialFilterExpression: { paymentId: { $exists: true } } },
);

export type SubscriptionFields = InferSchemaType<typeof subscriptionSchema>;
export const Subscription: Model<SubscriptionFields> =
  mongoose.models.Subscription ??
  mongoose.model("Subscription", subscriptionSchema);

const paymentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    packageId: { type: Schema.Types.ObjectId, required: true },
    packageName: { type: String, required: true },
    amountCents: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "expired"],
      default: "pending",
      required: true,
    },
    stripeSessionId: String,
    paidAt: Date,
  },
  { timestamps: true },
);

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });

export type PaymentFields = InferSchemaType<typeof paymentSchema>;
export const Payment: Model<PaymentFields> =
  mongoose.models.Payment ?? mongoose.model("Payment", paymentSchema);
