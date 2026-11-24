import { randomToken } from "@/server/auth/tokens";
import { demoMode } from "@/server/demo";
import { env } from "@/server/env";
import { AppError } from "@/server/errors";
import { route } from "@/server/http";
import { runScheduledJobs } from "@/server/jobs/jobs";
import { seedAll } from "@/seed/run";

// Seeding the public demo again takes a while.
export const maxDuration = 300;

// Called on a schedule with the shared secret: once a day by Vercel (see
// vercel.json), which sends a GET, and every minute by npm run cron.
const run = route(async (request) => {
  if (!env.CRON_SECRET) {
    throw new AppError("conflict", "Scheduled jobs aren't set up.");
  }
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    throw new AppError("unauthenticated", "Wrong or missing cron secret.");
  }

  // The public demo starts each day from the seed, with fresh dates. Visitors
  // sign in with one click, so the password only matters if one is set.
  const demo = demoMode()
    ? await seedAll({
        password: process.env.SEED_PASSWORD ?? randomToken(),
        keepPlaces: true,
      })
    : null;

  return Response.json({ ...(await runScheduledJobs()), demo });
});

export { run as GET, run as POST };
