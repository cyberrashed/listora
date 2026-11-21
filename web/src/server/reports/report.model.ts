import "server-only";
import mongoose, { type InferSchemaType, type Model, Schema } from "mongoose";

// Fixed reasons, so reports can be counted and sorted by them.
export const reportReasons = {
  scam: "Looks like a scam",
  prohibited: "Not allowed on Listora",
  misleading: "Wrong price or details",
  offensive: "Offensive or abusive",
  spam: "Spam or a duplicate",
  other: "Something else",
} as const;

export type ReportReason = keyof typeof reportReasons;

export const reportTargets = ["listing", "review", "user"] as const;

const schema = new Schema(
  {
    reporterId: { type: Schema.Types.ObjectId, required: true },
    target: {
      type: new Schema(
        {
          kind: { type: String, enum: reportTargets, required: true },
          id: { type: Schema.Types.ObjectId, required: true },
          // What it was when reported, in case it changes or goes.
          label: { type: String, required: true },
        },
        { _id: false },
      ),
      required: true,
    },
    reason: {
      type: String,
      enum: Object.keys(reportReasons),
      required: true,
    },
    note: { type: String, default: "" },
    status: {
      type: String,
      enum: ["open", "resolved", "dismissed"],
      default: "open",
      required: true,
    },
    resolution: new Schema(
      {
        staffName: { type: String, required: true },
        action: { type: String, required: true },
        at: { type: Date, required: true },
      },
      { _id: false },
    ),
  },
  { timestamps: true },
);

// One open report per person and target: reporting again changes nothing.
schema.index(
  { reporterId: 1, "target.kind": 1, "target.id": 1 },
  { unique: true, partialFilterExpression: { status: "open" } },
);
schema.index({ status: 1, createdAt: 1 });
schema.index({ "target.kind": 1, "target.id": 1, status: 1 });

export type ReportFields = InferSchemaType<typeof schema>;
export const Report: Model<ReportFields> =
  mongoose.models.Report ?? mongoose.model("Report", schema);
