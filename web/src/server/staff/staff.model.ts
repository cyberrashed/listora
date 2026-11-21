import "server-only";
import mongoose, { type InferSchemaType, type Model, Schema } from "mongoose";

const roleSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    // The owner role can do everything and cannot be edited or removed.
    owner: { type: Boolean, default: false, required: true },
    permissions: { type: [String], default: [], required: true },
  },
  { timestamps: true },
);

const staffSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    roleId: { type: Schema.Types.ObjectId, ref: "Role", required: true },
    active: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

const staffSessionSchema = new Schema({
  staffId: { type: Schema.Types.ObjectId, required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export type RoleFields = InferSchemaType<typeof roleSchema>;
export type StaffFields = InferSchemaType<typeof staffSchema>;

export const Role: Model<RoleFields> =
  mongoose.models.Role ?? mongoose.model("Role", roleSchema);
export const Staff: Model<StaffFields> =
  mongoose.models.Staff ?? mongoose.model("Staff", staffSchema);
export const StaffSession: Model<InferSchemaType<typeof staffSessionSchema>> =
  mongoose.models.StaffSession ??
  mongoose.model("StaffSession", staffSessionSchema);
