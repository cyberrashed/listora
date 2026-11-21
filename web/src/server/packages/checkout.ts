import "server-only";
import Stripe from "stripe";
import { connectDb, isObjectId } from "../db";
import { sendEmail } from "../emails/emails";
import { env } from "../env";
import { AppError } from "../errors";
import { User, type UserDoc } from "../users/user.model";
import { Package, Payment } from "./package.model";
import { issueCredits } from "./packages";

function stripe() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new AppError(
      "conflict",
      "Payments aren't set up on this server yet.",
    );
  }
  return new Stripe(env.STRIPE_SECRET_KEY);
}

/**
 * Starts a Stripe Checkout for a package and returns the page to pay on.
 * Nothing is given until Stripe confirms the payment, to the webhook or
 * when asked as the buyer comes back.
 */
export async function startCheckout(user: UserDoc, packageId: string) {
  await connectDb();

  const pkg = isObjectId(packageId)
    ? await Package.findOne({ _id: packageId, active: true }).lean()
    : null;
  if (!pkg) throw new AppError("not_found", "That package isn't for sale.");

  const payment = await Payment.create({
    userId: user._id,
    packageId: pkg._id,
    packageName: pkg.name,
    amountCents: pkg.priceCents,
  });
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    client_reference_id: payment.id as string,
    metadata: { paymentId: payment.id as string },
    // Prices and receipts are in dollars. Without this Stripe may offer
    // the buyer's local currency instead.
    adaptive_pricing: { enabled: false },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: pkg.priceCents,
          product_data: { name: `Listora: ${pkg.name}` },
        },
      },
    ],
    success_url: `${env.APP_URL}/pay/done?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.APP_URL}/pay/done?status=cancelled`,
  });

  payment.stripeSessionId = session.id;
  await payment.save();
  return { url: session.url! };
}

/** Marks a payment paid and hands over the package, exactly once. */
export async function fulfillPayment(paymentId: string) {
  await connectDb();

  const payment = isObjectId(paymentId)
    ? await Payment.findOneAndUpdate(
        // A bank payment can settle after the checkout was let go. Stripe
        // has the money by then, so the buyer still gets the package.
        { _id: paymentId, status: { $in: ["pending", "expired"] } },
        { status: "paid", paidAt: new Date() },
        { returnDocument: "after" },
      )
    : null;
  // Already handled, or not ours: Stripe sends some events more than once.
  if (!payment) return;

  const [pkg, customer] = await Promise.all([
    Package.findById(payment.packageId).lean(),
    User.findById(payment.userId).lean(),
  ]);
  if (!pkg || !customer) return;

  await issueCredits(customer._id, pkg, "purchase", payment._id);
  await sendEmail({
    to: customer.email,
    kind: "receipt",
    subject: `Receipt for ${pkg.name}`,
    body: `Thanks for your purchase. ${pkg.name}, $${(payment.amountCents / 100).toFixed(2)}, paid ${payment.paidAt!.toDateString()}.`,
  });
}

/**
 * Runs when Stripe sends the buyer back. The address proves nothing, so it
 * asks Stripe about the session. This also covers a local machine where
 * the webhook can't reach. Whichever comes first, this or the webhook,
 * hands over the package, and the other finds it done.
 */
export async function confirmCheckout(sessionId: string) {
  if (!env.STRIPE_SECRET_KEY) return false;

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe().checkout.sessions.retrieve(sessionId);
  } catch (error) {
    // An unknown or made-up session id.
    if (error instanceof Stripe.errors.StripeInvalidRequestError) return false;
    throw error;
  }

  const paymentId = session.metadata?.paymentId;
  if (session.payment_status !== "paid" || !paymentId) return false;
  await fulfillPayment(paymentId);
  return true;
}

/** Checks a webhook call really came from Stripe, then acts on it. */
export async function handleStripeWebhook(body: string, signature: string) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new AppError("conflict", "The Stripe webhook isn't set up.");
  }

  let event: Stripe.Event;
  try {
    // Verifying needs no API key, only the webhook secret.
    event = Stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    throw new AppError("validation", "That webhook signature is wrong.");
  }

  // A card is paid when the checkout completes. A bank payment completes
  // unpaid and settles days later, in a second event.
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object;
    const paymentId = session.metadata?.paymentId;
    if (session.payment_status === "paid" && paymentId) {
      await fulfillPayment(paymentId);
    }
  }
}
