import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "../auth/password";
import { createCategory } from "../categories/categories";
import { CustomField } from "../categories/category.model";
import { connectDb } from "../db";
import { Favorite } from "../favorites/favorite.model";
import {
  addFavorite,
  listFavorites,
  removeFavorite,
} from "../favorites/favorites";
import { Place } from "../places/place.model";
import type { Actor } from "../staff/authorize";
import { withTestDatabase } from "../testing";
import { User, type UserDoc } from "../users/user.model";
import { deleteAccount, setCustomerStatus } from "../users/users";
import {
  browseInput,
  browseListings,
  browsePlan,
  getPublicListing,
} from "./browse";
import { Listing } from "./listing.model";
import { approveListing, createListing, markListingSold } from "./listings";

withTestDatabase();

// A text search fails outright without its index, so wait for all of them.
beforeAll(async () => {
  await connectDb();
  await Listing.init();
});

const staff: Actor = {
  id: "000000000000000000000001",
  name: "Marcus Bell",
  email: "marcus@listora.test",
  role: "Moderator",
  owner: false,
  permissions: ["listings.review", "categories.manage", "customers.manage"],
};

let dana: UserDoc;
let miguel: UserDoc;
let vehicles: string;
let cars: string;
let mileage: string;
let transmission: string;
let austin: string;
let ids: Record<"civic" | "tacoma" | "ducati" | "boxes" | "piano", string>;

beforeEach(async () => {
  [dana, miguel] = await User.create([
    {
      name: "Dana Whitfield",
      email: "dana@mailbox.example",
      passwordHash: await hashPassword("a long enough password"),
      phone: "+1 512 555 0142",
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
  const motorcycles = await createCategory(staff, {
    name: "Motorcycles",
    parentId: vehicles,
  });
  const home = await createCategory(staff, { name: "Home", parentId: null });

  const fields = await CustomField.create([
    {
      label: "Mileage",
      type: "number",
      unit: "mi",
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

  const city = (name: string, state: string, lng: number, lat: number) => ({
    kind: "city" as const,
    key: name.toLowerCase(),
    city: name,
    state,
    population: 100000,
    point: { type: "Point" as const, coordinates: [lng, lat] },
  });
  // Round Rock is about 17 miles up the road from Austin.
  const [austinRow, roundRock, denver] = await Place.create([
    city("Austin", "TX", -97.7431, 30.2672),
    city("Round Rock", "TX", -97.6789, 30.5083),
    city("Denver", "CO", -104.9903, 39.7392),
  ]);
  austin = austinRow.id as string;

  // Approved one after the other, so each is newer than the one before.
  const publish = async (seller: UserDoc, input: Record<string, unknown>) => {
    const { id } = await createListing(seller, {
      description: "Well looked after and ready to pick up this week.",
      attributes: {},
      placeId: austin,
      showPhone: false,
      ...input,
    } as Parameters<typeof createListing>[1]);
    await approveListing(staff, id);
    return id;
  };

  ids = {
    civic: await publish(dana, {
      title: "2015 Honda Civic LX",
      categoryId: cars,
      price: { mode: "fixed", cents: 890000 },
      attributes: { [mileage]: 84250, [transmission]: "Automatic" },
      showPhone: true,
    }),
    tacoma: await publish(miguel, {
      title: "2019 Toyota Tacoma TRD",
      categoryId: cars,
      price: { mode: "negotiable", cents: 3150000 },
      attributes: { [mileage]: 41000, [transmission]: "Manual" },
      placeId: roundRock.id,
    }),
    ducati: await publish(miguel, {
      title: "Ducati Monster 821",
      categoryId: motorcycles,
      price: { mode: "fixed", cents: 720000 },
      placeId: denver.id,
    }),
    boxes: await publish(dana, {
      title: "Moving boxes, about thirty",
      categoryId: home,
      price: { mode: "free" },
    }),
    piano: await publish(miguel, {
      title: "Upright piano",
      description: "A Honda dealer took it in trade once. Needs tuning.",
      categoryId: home,
      price: { mode: "on_request" },
      placeId: denver.id,
    }),
  };

  // Still waiting for review: no buyer should ever see it.
  await createListing(dana, {
    title: "2012 Volkswagen Jetta SE",
    description: "Well looked after and ready to pick up this week.",
    categoryId: cars,
    price: { mode: "fixed", cents: 480000 },
    attributes: {},
    placeId: austin,
    showPhone: false,
  });
});

async function titles(query: Record<string, string> = {}) {
  const { items } = await browseListings(browseInput.parse(query));
  return items.map((item) => item.title);
}

describe("browsing", () => {
  it("shows what is approved, newest first", async () => {
    expect(await titles()).toEqual([
      "Upright piano",
      "Moving boxes, about thirty",
      "Ducati Monster 821",
      "2019 Toyota Tacoma TRD",
      "2015 Honda Civic LX",
    ]);
  });

  it("hides a seller's listings while their account is suspended", async () => {
    await setCustomerStatus(staff, miguel.id as string, "suspended");
    expect(await titles()).toEqual([
      "Moving boxes, about thirty",
      "2015 Honda Civic LX",
    ]);
    await expect(getPublicListing(ids.tacoma)).rejects.toMatchObject({
      code: "not_found",
    });

    await setCustomerStatus(staff, miguel.id as string, "active");
    expect(await titles()).toHaveLength(5);
  });

  it("hides a listing once it sells or its 30 days run out", async () => {
    await markListingSold(miguel, ids.ducati);
    await Listing.updateOne(
      { _id: ids.piano },
      { expiresAt: new Date(Date.now() - 1000) },
    );

    const page = await browseListings(browseInput.parse({}));

    expect(page.total).toBe(3);
    expect(page.items.map((item) => item.id)).not.toContain(ids.ducati);
    expect(page.items.map((item) => item.id)).not.toContain(ids.piano);
  });

  it("finds a category's listings under every category above it", async () => {
    expect(await titles({ categoryId: vehicles })).toEqual([
      "Ducati Monster 821",
      "2019 Toyota Tacoma TRD",
      "2015 Honda Civic LX",
    ]);
    expect(await titles({ categoryId: cars })).toHaveLength(2);
  });

  it("searches titles and descriptions, title matches first", async () => {
    expect(await titles({ q: "honda" })).toEqual([
      "2015 Honda Civic LX",
      "Upright piano",
    ]);
    expect(await titles({ q: "tacomas" })).toEqual(["2019 Toyota Tacoma TRD"]);
  });

  it("keeps to a price range", async () => {
    expect(await titles({ minCents: "500000", maxCents: "1000000" })).toEqual([
      "Ducati Monster 821",
      "2015 Honda Civic LX",
    ]);
  });

  it("orders by price with free first and unpriced listings left out", async () => {
    expect(await titles({ sort: "price_low" })).toEqual([
      "Moving boxes, about thirty",
      "Ducati Monster 821",
      "2015 Honda Civic LX",
      "2019 Toyota Tacoma TRD",
    ]);
    expect((await titles({ sort: "price_high" }))[0]).toBe(
      "2019 Toyota Tacoma TRD",
    );
  });

  it("keeps to a distance from the buyer's city", async () => {
    expect(await titles({ placeId: austin })).toEqual([
      "Moving boxes, about thirty",
      "2019 Toyota Tacoma TRD",
      "2015 Honda Civic LX",
    ]);
    expect(await titles({ placeId: austin, radius: "5" })).toEqual([
      "Moving boxes, about thirty",
      "2015 Honda Civic LX",
    ]);
  });

  it("narrows by the answers sellers gave", async () => {
    const narrow = (filters: Record<string, unknown>) =>
      titles({ categoryId: cars, filters: JSON.stringify(filters) });

    expect(await narrow({ [transmission]: ["Manual"] })).toEqual([
      "2019 Toyota Tacoma TRD",
    ]);
    expect(await narrow({ [mileage]: { min: 50000 } })).toEqual([
      "2015 Honda Civic LX",
    ]);
    expect(
      await narrow({
        [transmission]: ["Automatic", "Manual"],
        [mileage]: { max: 50000 },
      }),
    ).toEqual(["2019 Toyota Tacoma TRD"]);
  });

  it("refuses a query it can't read", async () => {
    expect(browseInput.safeParse({ filters: "{not json" }).success).toBe(false);
    expect(browseInput.safeParse({ sort: "cheapest" }).success).toBe(false);
  });

  it("answers every common search from an index", async () => {
    const searches: Record<string, string>[] = [
      {},
      { sort: "price_low" },
      { categoryId: cars },
      { categoryId: cars, sort: "price_high" },
      { q: "honda" },
      { placeId: austin },
    ];

    for (const search of searches) {
      const { filter, sort } = await browsePlan(browseInput.parse(search));
      const plan: unknown = await Listing.find(filter)
        .sort(sort)
        .explain("queryPlanner");

      expect(JSON.stringify(plan), JSON.stringify(search)).not.toContain(
        "COLLSCAN",
      );
    }
  });
});

describe("a listing as buyers see it", () => {
  it("shows the seller and the city, never the exact point", async () => {
    const listing = await getPublicListing(ids.civic);

    expect(listing).toMatchObject({
      title: "2015 Honda Civic LX",
      city: "Austin",
      category: { path: ["Vehicles", "Cars & Trucks"] },
      attributes: [
        { label: "Mileage", unit: "mi", value: 84250 },
        { label: "Transmission", value: "Automatic" },
      ],
      seller: { name: "Dana Whitfield", phone: "+1 512 555 0142" },
    });
    expect(JSON.stringify(listing)).not.toContain("coordinates");
    expect(JSON.stringify(listing)).not.toContain(dana.email);
  });

  it("keeps the phone number back unless the seller chose to show it", async () => {
    expect((await getPublicListing(ids.boxes)).seller.phone).toBeNull();
  });

  it("is missing while it is not on the market", async () => {
    const waiting = await Listing.findOne({ status: "in_review" });

    await expect(getPublicListing(waiting!.id as string)).rejects.toMatchObject(
      { code: "not_found" },
    );
  });
});

describe("saved listings", () => {
  it("lists what a buyer saved, latest save first, once each", async () => {
    await addFavorite(miguel, ids.civic);
    await addFavorite(miguel, ids.boxes);
    await addFavorite(miguel, ids.civic);

    expect((await listFavorites(miguel)).map((item) => item.id)).toEqual([
      ids.boxes,
      ids.civic,
    ]);
    expect(await listFavorites(dana)).toEqual([]);
  });

  it("drops a listing that was removed or has sold", async () => {
    await addFavorite(miguel, ids.civic);
    await addFavorite(miguel, ids.boxes);

    await removeFavorite(miguel, ids.boxes);
    await markListingSold(dana, ids.civic);

    expect(await listFavorites(miguel)).toEqual([]);
  });

  it("only saves what is on the market", async () => {
    const waiting = await Listing.findOne({ status: "in_review" });

    await expect(
      addFavorite(miguel, waiting!.id as string),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("goes with the account, along with the listings, when it is deleted", async () => {
    await addFavorite(dana, ids.tacoma);

    await deleteAccount(dana, "a long enough password");

    expect(await Favorite.countDocuments()).toBe(0);
    expect(await Listing.countDocuments({ sellerId: dana._id })).toBe(0);
    expect(await titles()).not.toContain("2015 Honda Civic LX");
  });
});
