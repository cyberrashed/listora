import mongoose from "mongoose";
import { afterAll, beforeEach } from "vitest";
import { connectDb } from "./db";

// Call at the top of a test file that touches the database. Each test starts
// from empty collections.
export function withTestDatabase() {
  beforeEach(async () => {
    const { connection } = await connectDb();
    const collections = await connection.db!.collections();
    await Promise.all(collections.map((collection) => collection.deleteMany()));
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });
}
