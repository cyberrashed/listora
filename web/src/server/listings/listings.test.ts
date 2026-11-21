import { beforeEach, describe, expect, it } from "vitest";
import {
  createCategory,
  listAllCategories,
  updateCategory,
} from "../categories/categories";
import { CustomField } from "../categories/category.model";
import { Email } from "../emails/email.model";
import { Notification } from "../notifications/notification.model";
import { Place } from "../places/place.model";
import type { Actor } from "../staff/authorize";
import { withTestDatabase } from "../testing";
import { User, type UserDoc } from "../users/user.model";
import {
  approveListing,
  createListing,
  deleteListing,
  listingInput,
  listListings,
  listOwnListings,
  markListingSold,
  rejectListing,
  reviseListing,
} from "./listings";

withTestDatabase();

const staff: Actor = {
  id: "000000000000000000000001",
  name: "Marcus Bell",
  email: "marcus@listora.test",
  role: "Moderator",
  owner: false,
  permissions: ["listings.review", "categories.manage"],
};
const support: Actor = { ...staff, role: "Support", permissions: [] };

let dana: UserDoc;
let miguel: UserDoc;
let cars: string;
let vehicles: string;
let austin: string;
let mileage: string;
let transmission: string;

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

  vehicles = await createCategory(staff, { name: "Vehicles", parentId: null });
  cars = await createCategory(staff, {
    name: "Cars & Trucks",
    parentId: vehicles,
  });

  const fields = await CustomField.create([
    {
      label: "Mileage",
      type: "number",
      unit: "mi",
      required: true,
      categoryIds: [cars],
      order: 1,
    },
    {
      label: "Transmission",
      type: "select",
      options: ["Automatic", "Manual"],
      categoryIds: [cars],
      order: 2,
    },
  ]);
  mileage = fields[0].id as string;
  transmission = fields[1].id as string;

  const place = await Place.create({
    kind: "city",
    key: "austin",
    city: "Austin",
    state: "TX",
    population: 979882,
    point: { type: "Point", coordinates: [-97.7541, 30.2986] },
  });
  austin = place.id as string;
});

const civic = (overrides: Record<string, unknown> = {}) => ({
  title: "2015 Honda Civic LX",
  description: "One owner, clean title, new tires in March. Runs great.",
  categoryId: cars,
  price: { mode: "fixed" as const, cents: 890000 },
  attributes: { [mileage]: 84250, [transmission]: "Automatic" },
  placeId: austin,
  showPhone: false,
  ...overrides,
});

const post = (seller = dana, overrides?: Record<string, unknown>) =>
  createListing(seller, civic(overrides));

describe("posting a listing", () => {
  it("puts it in the review queue with its category, answers and city", async () => {
    const listing = await post();

    expect(listing).toMatchObject({
      status: "in_review",
      category: { path: ["Vehicles", "Cars & Trucks"] },
      location: { city: "Austin", state: "TX" },
      attributes: [
        { label: "Mileage", unit: "mi", value: 84250 },
        { label: "Transmission", unit: null, value: "Automatic" },
      ],
    });
    expect(JSON.stringify(listing)).not.toContain("coordinates");
  });

  it("needs a category with nothing under it", async () => {
    await expect(post(dana, { categoryId: vehicles })).rejects.toMatchObject({
      code: "validation",
      fields: { categoryId: expect.any(String) },
    });
  });

  it("refuses a category that customers can't see", async () => {
    const row = (await listAllCategories()).find(
      (item) => item.id === vehicles,
    )!;
    await updateCategory(staff, vehicles, {
      name: row.name,
      slug: row.slug,
      parentId: null,
      active: false,
    });

    await expect(post()).rejects.toMatchObject({
      code: "validation",
      fields: { categoryId: expect.any(String) },
    });
  });

  it("checks the answers against the category's fields", async () => {
    const missing = post(dana, { attributes: {} }).catch((error) => error);
    const wrongChoice = post(dana, {
      attributes: { [mileage]: 84250, [transmission]: "CVT" },
    }).catch((error) => error);

    expect(await missing).toMatchObject({
      fields: { [`attributes.${mileage}`]: "Enter the mileage." },
    });
    expect(await wrongChoice).toMatchObject({
      fields: { [`attributes.${transmission}`]: expect.any(String) },
    });
  });

  it("checks the price against its mode", async () => {
    const price = (value: unknown) =>
      listingInput.safeParse(civic({ price: value })).success;

    expect(price({ mode: "free" })).toBe(true);
    expect(price({ mode: "fixed" })).toBe(false);
    expect(price({ mode: "range", cents: 5000, maxCents: 4000 })).toBe(false);
    expect(price({ mode: "range", cents: 4000, maxCents: 5000 })).toBe(true);
  });
});

describe("review", () => {
  it("approving puts the listing on the market for 30 days and tells the seller", async () => {
    const { id } = await post();

    await approveListing(staff, id);

    const [listing] = await listOwnListings(dana);
    const days =
      (Date.parse(listing.expiresAt!) - Date.parse(listing.publishedAt!)) /
      86_400_000;
    expect(listing.status).toBe("active");
    expect(days).toBeCloseTo(30, 3);
    expect(
      await Email.countDocuments({ to: dana.email, kind: "listing_approved" }),
    ).toBe(1);
    expect(await Notification.find({ userId: dana._id }).lean()).toMatchObject([
      { kind: "listing_approved", link: `/selling/${id}` },
    ]);
    await expect(approveListing(staff, id)).rejects.toMatchObject({
      code: "conflict",
    });
  });

  it("a soft rejection can be fixed and sent in again", async () => {
    const { id } = await post();
    await rejectListing(staff, id, {
      kind: "soft",
      reason: "Add the mileage to the description.",
    });
    expect((await listOwnListings(dana))[0]).toMatchObject({
      status: "rejected",
      rejection: { kind: "soft" },
    });

    const revised = await reviseListing(
      dana,
      id,
      civic({ title: "2015 Honda Civic LX, 84k miles" }),
    );

    expect(revised).toMatchObject({
      status: "in_review",
      rejection: null,
      title: "2015 Honda Civic LX, 84k miles",
    });
  });

  it("a permanent rejection is final", async () => {
    const { id } = await post();
    await rejectListing(staff, id, {
      kind: "permanent",
      reason: "Listings for recalled items are not allowed.",
    });

    await expect(reviseListing(dana, id, civic())).rejects.toMatchObject({
      code: "conflict",
    });
  });

  it("editing a live listing sends it back for review", async () => {
    const { id } = await post();
    await approveListing(staff, id);

    const revised = await reviseListing(
      dana,
      id,
      civic({ price: { mode: "negotiable", cents: 850000 } }),
    );

    expect(revised.status).toBe("in_review");
    expect(revised.price).toMatchObject({ mode: "negotiable", cents: 850000 });
  });

  it("is closed to staff without the permission", async () => {
    const { id } = await post();

    await expect(approveListing(support, id)).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(listListings(support, {})).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("lists the queue oldest first, with a count for every status", async () => {
    const first = await post(dana, { title: "First in the queue" });
    await post(miguel, { title: "Second in the queue" });
    const live = await post(dana, { title: "Already approved" });
    await approveListing(staff, live.id);

    const queue = await listListings(staff, { status: "in_review" });

    expect(queue.items.map((item) => item.title)).toEqual([
      "First in the queue",
      "Second in the queue",
    ]);
    expect(queue.items[0]).toMatchObject({
      id: first.id,
      seller: { name: "Dana Whitfield" },
    });
    expect(queue.counts).toEqual({
      in_review: 2,
      active: 1,
      rejected: 0,
      sold: 0,
      expired: 0,
    });
  });
});

describe("a seller's own listings", () => {
  it("can be marked sold only while live", async () => {
    const { id } = await post();
    await expect(markListingSold(dana, id)).rejects.toMatchObject({
      code: "conflict",
    });

    await approveListing(staff, id);
    expect((await markListingSold(dana, id)).status).toBe("sold");
  });

  it("are invisible and untouchable to other sellers", async () => {
    const { id } = await post(dana);

    expect(await listOwnListings(miguel)).toEqual([]);
    for (const attempt of [
      () => markListingSold(miguel, id),
      () => reviseListing(miguel, id, civic()),
      () => deleteListing(miguel, id),
    ]) {
      await expect(attempt()).rejects.toMatchObject({ code: "not_found" });
    }
    expect(await listOwnListings(dana)).toHaveLength(1);
  });

  it("can be deleted", async () => {
    const { id } = await post();

    await deleteListing(dana, id);

    expect(await listOwnListings(dana)).toEqual([]);
  });
});
