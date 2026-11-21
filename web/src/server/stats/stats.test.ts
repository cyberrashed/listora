import { beforeEach, describe, expect, it } from "vitest";
import { createCategory } from "../categories/categories";
import { Listing } from "../listings/listing.model";
import { approveListing, createListing } from "../listings/listings";
import { Package, Payment } from "../packages/package.model";
import { Place } from "../places/place.model";
import { Report } from "../reports/report.model";
import { fileReport } from "../reports/reports";
import type { Actor } from "../staff/authorize";
import { withTestDatabase } from "../testing";
import { User, type UserDoc } from "../users/user.model";
import { setCustomerStatus } from "../users/users";
import { getOverview, STATS_TIME_ZONE } from "./stats";

withTestDatabase();

const owner: Actor = {
  id: "000000000000000000000001",
  name: "Priya Raman",
  email: "priya@listora.test",
  role: "Owner",
  owner: true,
  permissions: [],
};
const support: Actor = {
  ...owner,
  name: "Elena Vasquez",
  role: "Support",
  owner: false,
  permissions: ["customers.view"],
};

const DAY = 86_400_000;
let dana: UserDoc;
let miguel: UserDoc;

beforeEach(async () => {
  [dana, miguel] = await User.create([
    {
      name: "Dana Whitfield",
      email: "dana@mailbox.example",
      passwordHash: "x",
    },
    {
      name: "Miguel Ortega",
      email: "miguel@mailbox.example",
      passwordHash: "x",
    },
  ]);
  const home = await createCategory(owner, { name: "Home", parentId: null });
  const furniture = await createCategory(owner, {
    name: "Furniture",
    parentId: home,
  });
  const cars = await createCategory(owner, { name: "Cars", parentId: null });
  const austin = await Place.create({
    kind: "city",
    key: "austin",
    city: "Austin",
    state: "TX",
    population: 979882,
    point: { type: "Point", coordinates: [-97.7431, 30.2672] },
  });
  const post = (seller: UserDoc, title: string, categoryId: string) =>
    createListing(seller, {
      title,
      description: "Well looked after and ready to pick up this week.",
      categoryId,
      price: { mode: "fixed", cents: 42000 },
      attributes: {},
      placeId: austin.id as string,
      showPhone: false,
    });

  const dresser = await post(dana, "Walnut dresser, six drawers", furniture);
  const table = await post(dana, "Oak dining table", furniture);
  const civic = await post(miguel, "2015 Honda Civic LX", cars);
  await post(miguel, "Ford F-150 bed cover", cars);
  for (const { id } of [dresser, table, civic]) await approveListing(owner, id);

  // Posted earlier: one five days ago, one well outside the 30 days.
  await Listing.updateOne(
    { _id: table.id },
    { createdAt: new Date(Date.now() - 5 * DAY) },
    { timestamps: false, overwriteImmutable: true },
  );
  await Listing.updateOne(
    { _id: civic.id },
    { createdAt: new Date(Date.now() - 45 * DAY) },
    { timestamps: false, overwriteImmutable: true },
  );

  const pack = await Package.create({
    name: "Seller Plus",
    kind: "listing",
    priceCents: 999,
    quantity: 10,
    days: 30,
  });
  await Payment.create([
    {
      userId: dana._id,
      packageId: pack._id,
      packageName: pack.name,
      amountCents: 999,
      status: "paid",
      paidAt: new Date(),
    },
    {
      userId: miguel._id,
      packageId: pack._id,
      packageName: pack.name,
      amountCents: 999,
      status: "pending",
    },
  ]);
  await fileReport(miguel, {
    kind: "listing",
    id: dresser.id,
    reason: "misleading",
    note: "",
  });
});

describe("the overview", () => {
  it("agrees with the database counted directly", async () => {
    const overview = await getOverview(owner);
    const now = new Date();

    expect(overview.waiting).toBe(
      await Listing.countDocuments({ status: "in_review" }),
    );
    expect(overview.live).toBe(
      await Listing.countDocuments({
        status: "active",
        expiresAt: { $gt: now },
      }),
    );
    expect(overview.openReports).toBe(
      await Report.countDocuments({ status: "open" }),
    );
    const [paid] = await Payment.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, cents: { $sum: "$amountCents" } } },
    ]);
    expect(overview.revenue).toEqual({ cents: paid.cents, count: 1 });
    expect(overview.newCustomers).toBe(await User.countDocuments());

    const recent = await Listing.countDocuments({
      createdAt: { $gte: new Date(now.getTime() - 29 * DAY - 1) },
    });
    expect(overview.postedPerDay).toHaveLength(30);
    expect(overview.postedPerDay.reduce((sum, day) => sum + day.count, 0)).toBe(
      recent,
    );
    // Two were posted today; the others were moved into the past.
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: STATS_TIME_ZONE,
    }).format(now);
    expect(overview.postedPerDay.at(-1)).toEqual({ day: today, count: 2 });

    expect(overview.liveByCategory).toEqual([
      { name: "Home", count: 2 },
      { name: "Cars", count: 1 },
    ]);
  });

  it("leaves out a suspended seller's listings", async () => {
    await setCustomerStatus(owner, dana.id as string, "suspended");

    const overview = await getOverview(owner);

    expect(overview.live).toBe(1);
    expect(overview.liveByCategory).toEqual([{ name: "Cars", count: 1 }]);
  });

  it("shows each role only what it covers", async () => {
    const overview = await getOverview(support);

    expect(overview).toMatchObject({
      waiting: null,
      queue: null,
      revenue: null,
      openReports: null,
      pendingVerification: null,
      newCustomers: 2,
    });
  });
});
