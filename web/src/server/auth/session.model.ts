import "server-only";
import mongoose, { type InferSchemaType, type Model, Schema } from "mongoose";

// One document per signed-in device. The refresh token rotates on every use;
// the previous hash is kept so a replayed token can be told from a random one.
const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  previousTokenHash: { type: String, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export const Session: Model<InferSchemaType<typeof schema>> =
  mongoose.models.Session ?? mongoose.model("Session", schema);
