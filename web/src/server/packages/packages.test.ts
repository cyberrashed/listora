import Stripe from "stripe";
import { beforeEach, describe, expect, it } from "vitest";
import { createCategory } from "../categories/categories";
import { Email } from "../emails/email.model";
import { runScheduledJobs } from "../jobs/jobs";
import { browseInput, browseListings } from "../listings/browse";
import { Listing } from "../listings/listing.model";
import {
  approveListing,
  createListing,
  featureListing,
  renewListing,
} from "../listings/listings";
import { Notification } from "../notifications/notification.model";
import { Place } from "../places/place.model";
import type { Actor } from "../staff/authorize";
import { withTestDatabase } from "../testing";
import { User, type UserDoc } from "../users/user.model";
import { handleStripeWebhook } from "./checkout";
import { Package, Payment, Subscription } from "./package.model";
import { grantPackage, listPayments, myCredits } from "./packages";

withTestDatabase();

// The default in Settings.
const FREE_LISTINGS_PER_MONTH = 3;

const staff: Actor = {
  id: "000000000000000000000001",
  name: "Priya Raman",
  email: "priya@listora.test",
  role: "Owner",
  owner: true,
  permissions: [],
};

let dana: UserDoc;
let cars: string;
let home: string;
let austin: string;

beforeEach(async () => {
  dana = await User.create({
    name: "Dana Whitfield",
    email: "dana@mailbox.example",
    passwordHash: "x",
  });
  const vehicles = await createCategory(staff, {
    name: "Vehicles",
    parentId: null,
  });
  cars = await createCategory(staff, { name: "Cars", parentId: vehicles });
  home = await createCategory(staff, { name: "Home", parentId: null });
  austin = (
    await Place.create({
      kind: "city",
      key: "austin",
      city: "Austin",
      state: "TX",
      population: 979882,
      point: { type: "Point", coordinates: [-97.7431, 30.2672] },
    })
  ).id as string;
});

const post = (categoryId = home, title = "Walnut dresser, six drawers") =>
  createListing(dana, {
    title,
    description: "Well looked after and ready to pick up this week.",
    categoryId,
    price: { mode: "fixed", cents: 42000 },
    attributes: {},
    placeId: austin,
    showPhone: false,
  });

const listingPack = (overrides = {}) =>
  Package.create({
    name: "Seller Plus",
    kind: "listing",
    priceCents: 999,
    quantity: 5,
    days: 30,
    ...overrides,
  });

describe("listing credits", () => {
  it(`give ${FREE_LISTINGS_PER_MONTH} free listings a month, then ask for a package`, async () => {
    for (let index = 0; index < FREE_LISTINGS_PER_MONTH; index++) await post();

    await expect(post()).rejects.toMatchObject({ code: "payment_required" });

    const pack = await listingPack();
    await grantPackage(staff, {
      packageId: pack.id as string,
      email: dana.email,
    });
    await post();
    expect(await myCredits(dana)).toMatchObject([
      { name: "Seller Plus", remaining: 4 },
    ]);
  });

  it("are spent once each, even by posts that arrive together", async () => {
    for (let index = 0; index < FREE_LISTINGS_PER_MONTH; index++) await post();
    const pack = await listingPack({ quantity: 2 });
    await grantPackage(staff, {
      packageId: pack.id as string,
      email: dana.email,
    });

    const results = await Promise.allSettled(
      Array.from({ length: 6 }, (_, index) =>
        post(home, `Bookcase number ${index + 1}`),
      ),
    );

    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(2);
    expect(await Listing.countDocuments({ sellerId: dana._id })).toBe(
      FREE_LISTINGS_PER_MONTH + 2,
    );
  });

  it("only cover the categories their package is for", async () => {
    for (let index = 0; index < FREE_LISTINGS_PER_MONTH; index++) await post();
    const pack = await listingPack({ categoryIds: [cars] });
    await grantPackage(staff, {
      packageId: pack.id as string,
      email: dana.email,
    });

    await expect(post(home)).rejects.toMatchObject({
      code: "payment_required",
    });
    await post(cars, "2015 Honda Civic LX");
  });
});

describe("featuring", () => {
  it("puts a live listing on top for the package's days", async () => {
    const { id } = await post();
    await approveListing(staff, id);
    await expect(featureListing(dana, id)).rejects.toMatchObject({
      code: "payment_required",
    });

    const pack = await Package.create({
      name: "Spotlight",
      kind: "featured",
      priceCents: 499,
      quantity: 1,
      days: 30,
      featureDays: 7,
    });
    await grantPackage(staff, {
      packageId: pack.id as string,
      email: dana.email,
    });
    const featured = await featureListing(dana, id);

    const days =
      (Date.parse(featured.featuredUntil!) - Date.now()) / 86_400_000;
    expect(days).toBeCloseTo(7, 1);
    const { items } = await browseListings(
      browseInput.parse({ featured: "1" }),
    );
    expect(items).toMatchObject([{ id, featured: true }]);
  });
});

describe("scheduled jobs", () => {
  it("end listings past their 30 days, warn before, and can be run again", async () => {
    const { id: ending } = await post(home, "Oak bookcase");
    const { id: ended } = await post(home, "Pine bookcase");
    await approveListing(staff, ending);
    await approveListing(staff, ended);
    const now = Date.now();
    await Listing.updateOne(
      { _id: ending },
      { expiresAt: new Date(now + 2 * 86_400_000) },
    );
    await Listing.updateOne(
      { _id: ended },
      { expiresAt: new Date(now - 1000) },
    );

    expect(await runScheduledJobs()).toMatchObject({ expired: 1, warned: 1 });
    expect(await runScheduledJobs()).toMatchObject({ expired: 0, warned: 0 });

    expect((await Listing.findById(ended).lean())!.status).toBe("expired");
    expect(
      await Notification.find({
        kind: { $in: ["listing_expired", "listing_expiring"] },
      })
        .sort({ kind: 1 })
        .lean(),
    ).toMatchObject([
      { kind: "listing_expired" },
      { kind: "listing_expiring" },
    ]);
    expect(await Email.countDocuments({ kind: "listing_expired" })).toBe(1);

    // Renewing puts it back up and takes a credit.
    const renewed = await renewListing(dana, ended);
    expect(renewed.status).toBe("active");
  });
});

describe("Stripe", () => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET!;

  async function completed(
    paymentId: string,
    paid = true,
    type = "checkout.session.completed",
  ) {
    const payload = JSON.stringify({
      id: "evt_test",
      object: "event",
      type,
      data: {
        object: {
          id: "cs_test",
          object: "checkout.session",
          payment_status: paid ? "paid" : "unpaid",
          metadata: { paymentId },
        },
      },
    });
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret,
    });
    return handleStripeWebhook(payload, signature);
  }

  it("turns a confirmed payment into credits, once", async () => {
    const pack = await listingPack();
    const payment = await Payment.create({
      userId: dana._id,
      packageId: pack._id,
      packageName: pack.name,
      amountCents: pack.priceCents,
    });

    await completed(payment.id as string);
    await completed(payment.id as string);

    expect(await Subscription.countDocuments({ source: "purchase" })).toBe(1);
    expect(await Email.countDocuments({ kind: "receipt" })).toBe(1);
    expect(await listPayments(staff)).toMatchObject({
      total: 1,
      month: { cents: 999, count: 1 },
    });
  });

  it("ignores a payment that isn't settled, and anything unsigned", async () => {
    const pack = await listingPack();
    const payment = await Payment.create({
      userId: dana._id,
      packageId: pack._id,
      packageName: pack.name,
      amountCents: pack.priceCents,
    });

    await completed(payment.id as string, false);
    expect(await Subscription.countDocuments({ source: "purchase" })).toBe(0);

    await expect(
      handleStripeWebhook("{}", "t=1,v1=not-a-signature"),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("hands over a bank payment that settles after the checkout was let go", async () => {
    const pack = await listingPack();
    const payment = await Payment.create({
      userId: dana._id,
      packageId: pack._id,
      packageName: pack.name,
      amountCents: pack.priceCents,
      status: "expired",
    });

    await completed(
      payment.id as string,
      true,
      "checkout.session.async_payment_succeeded",
    );

    expect(await Subscription.countDocuments({ source: "purchase" })).toBe(1);
    expect(await Payment.findById(payment._id).lean()).toMatchObject({
      status: "paid",
    });
  });
});
