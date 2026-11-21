import "server-only";
import mongoose, {
  type HydratedDocument,
  type InferSchemaType,
  type Model,
  Schema,
} from "mongoose";

const schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    phone: String,
    // Set when staff approve a verification request.
    verified: { type: Boolean, default: false, required: true },
    // Kept in step with visible reviews, so profiles don't add them up.
    ratingAverage: { type: Number, default: 0, required: true },
    ratingCount: { type: Number, default: 0, required: true },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
      required: true,
    },
    passwordReset: {
      codeHash: String,
      expiresAt: Date,
      attempts: Number,
    },
  },
  { timestamps: true },
);

export type UserFields = InferSchemaType<typeof schema>;
export type UserDoc = HydratedDocument<UserFields>;
// Hot reload re-runs this file, and Mongoose refuses to compile a model name
// twice, so an existing model is reused. Every model file does the same.
export const User: Model<UserFields> =
  mongoose.models.User ?? mongoose.model("User", schema);

export function toUserDto(user: UserDoc) {
  return {
    id: user.id as string,
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    status: user.status,
    verified: user.verified,
    createdAt: user.createdAt.toISOString(),
  };
}

export type UserDto = ReturnType<typeof toUserDto>;
