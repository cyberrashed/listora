// Resets the database to a known demo state.
//
//   npm run seed
import mongoose from "mongoose";
import { seedAll } from "./run";

const password = process.env.SEED_PASSWORD;
if (!password) throw new Error("Set SEED_PASSWORD in .env.local first.");

seedAll({ password })
  .then((summary) => {
    console.log(`${summary} Every seeded account signs in with SEED_PASSWORD.`);
  })
  .finally(() => mongoose.disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
