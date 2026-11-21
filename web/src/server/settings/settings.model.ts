import "server-only";
import mongoose, { type InferSchemaType, type Model, Schema } from "mongoose";

// One document: how the marketplace runs, as staff set it.
const schema = new Schema(
  {
    key: { type: String, default: "app", unique: true, required: true },
    freeListingsPerMonth: { type: Number, default: 3, min: 0, required: true },
    maintenance: { type: Boolean, default: false, required: true },
    maintenanceMessage: {
      type: String,
      default:
        "Listora is down for a short update. Try again in a few minutes.",
      required: true,
    },
    // Older app builds are asked to update before they go on.
    minAppVersion: { type: String, default: "0.1.0", required: true },
    supportEmail: {
      type: String,
      default: "help@listora.example",
      required: true,
    },
  },
  { timestamps: true },
);

export type SettingsFields = InferSchemaType<typeof schema>;
export const Settings: Model<SettingsFields> =
  mongoose.models.Settings ?? mongoose.model("Settings", schema);
