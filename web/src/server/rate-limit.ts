import "server-only";
import mongoose, { type InferSchemaType, type Model, Schema } from "mongoose";
import { connectDb } from "./db";
import { AppError } from "./errors";

// Counters live in the database so the limit holds across server instances.
const schema = new Schema({
  _id: String,
  count: { type: Number, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

const Counter: Model<InferSchemaType<typeof schema>> =
  mongoose.models.RateLimit ?? mongoose.model("RateLimit", schema);

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
) {
  await connectDb();

  const now = new Date();
  const counter = await Counter.findOneAndUpdate(
    { _id: key, expiresAt: { $gt: now } },
    {
      $inc: { count: 1 },
      $setOnInsert: {
        expiresAt: new Date(now.getTime() + windowSeconds * 1000),
      },
    },
    { upsert: true, returnDocument: "after" },
  ).catch(async (error: { code?: number }) => {
    // An expired counter that the TTL sweep has not removed yet still holds
    // the key, so the upsert collides. Start a fresh window.
    if (error.code !== 11000) throw error;
    return Counter.findOneAndReplace(
      { _id: key },
      {
        count: 1,
        expiresAt: new Date(now.getTime() + windowSeconds * 1000),
      },
      { returnDocument: "after" },
    );
  });

  if (counter && counter.count > limit) {
    throw new AppError(
      "rate_limited",
      "Too many attempts. Wait a minute and try again.",
    );
  }
}
