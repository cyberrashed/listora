import "server-only";
import mongoose, { type InferSchemaType, type Model, Schema } from "mongoose";

export const activityActions = [
  "listing.approved",
  "listing.rejected",
  "report.resolved",
  "report.dismissed",
  "review.hidden",
  "review.restored",
  "customer.suspended",
  "customer.reinstated",
  "verification.approved",
  "verification.rejected",
  "package.granted",
  "settings.changed",
  "announcement.sent",
  "conversation.read",
] as const;

// Who on the team did what, kept as it was said at the time: names are
// copied in so the log still reads right after someone leaves.
const schema = new Schema(
  {
    staffId: { type: Schema.Types.ObjectId, required: true },
    staffName: { type: String, required: true },
    action: { type: String, enum: activityActions, required: true },
    target: {
      type: new Schema(
        {
          kind: {
            type: String,
            enum: [
              "listing",
              "review",
              "customer",
              "report",
              "verification",
              "package",
              "settings",
              "announcement",
              "conversation",
            ],
            required: true,
          },
          id: { type: Schema.Types.ObjectId, required: true },
          label: { type: String, required: true },
        },
        { _id: false },
      ),
      required: true,
    },
    note: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

schema.index({ createdAt: -1 });

export type ActivityFields = InferSchemaType<typeof schema>;
export const Activity: Model<ActivityFields> =
  mongoose.models.Activity ?? mongoose.model("Activity", schema);
