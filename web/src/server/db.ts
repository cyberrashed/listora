import "server-only";
import mongoose from "mongoose";
import { env } from "./env";

// Hot reload re-evaluates this module in dev, so the connection lives on
// globalThis to stay at one per process.
const cache = globalThis as typeof globalThis & {
  mongoose?: Promise<typeof mongoose>;
};

export function connectDb() {
  cache.mongoose ??= mongoose
    .connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
    .catch((error: unknown) => {
      cache.mongoose = undefined;
      throw error;
    });

  return cache.mongoose;
}

export function isObjectId(value: string) {
  return mongoose.isValidObjectId(value);
}
