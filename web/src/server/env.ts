import "server-only";
import { z } from "zod";

const schema = z.object({
  MONGODB_URI: z.url(),
  JWT_SECRET: z.string().min(32),
  // Where links that leave the app come back to, like Stripe's return page.
  // The default is the host machine as the Android emulator reaches it.
  APP_URL: z.url().default("http://10.0.2.2:3100"),
  // Payments and scheduled jobs stay off until these are set.
  STRIPE_SECRET_KEY: z.string().startsWith("sk_test_").optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
  CRON_SECRET: z.string().min(16).optional(),
  // Photos live in this bucket. The AWS SDK reads its own AWS_REGION,
  // AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY from the environment.
  S3_BUCKET: z.string().min(3).optional(),
});

export const env = schema.parse(process.env);
