import { AppError } from "@/server/errors";
import { route } from "@/server/http";
import { handleStripeWebhook } from "@/server/packages/checkout";

// Stripe's word is the only thing that turns a payment into a package.
export const POST = route(async (request) => {
  const signature = request.headers.get("stripe-signature");
  if (!signature) throw new AppError("validation", "Missing signature.");
  await handleStripeWebhook(await request.text(), signature);
  return Response.json({ received: true });
});
