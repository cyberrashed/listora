import { env } from "@/server/env";
import { AppError } from "@/server/errors";
import { route } from "@/server/http";
import { runScheduledJobs } from "@/server/jobs/jobs";

// Called on a schedule with the shared secret: once a day by Vercel (see
// vercel.json), which sends a GET, and every minute by npm run cron.
const run = route(async (request) => {
  if (!env.CRON_SECRET) {
    throw new AppError("conflict", "Scheduled jobs aren't set up.");
  }
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    throw new AppError("unauthenticated", "Wrong or missing cron secret.");
  }
  return Response.json(await runScheduledJobs());
});

export { run as GET, run as POST };
