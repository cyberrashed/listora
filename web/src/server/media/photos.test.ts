import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCategory } from "../categories/categories";
import { getPublicListing } from "../listings/browse";
import {
  approveListing,
  createListing,
  deleteListing,
  reviseListing,
} from "../listings/listings";
import { Place } from "../places/place.model";
import type { Actor } from "../staff/authorize";
import { withTestDatabase } from "../testing";
import { User, type UserDoc } from "../users/user.model";
import { Photo } from "./photo.model";
import { readPhoto, removeUnusedPhotos, uploadPhoto } from "./photos";

// S3 stands in as a map, so these tests run without the internet.
const bucket = vi.hoisted(() => new Map<string, Buffer>());
vi.mock("./storage", () => ({
  putFile: async (key: string, body: Buffer) => {
    bucket.set(key, body);
  },
  getFile: async (key: string) =>
    bucket.has(key)
      ? { body: bucket.get(key), contentType: "image/webp", size: 0 }
      : null,
  deleteFiles: async (keys: string[]) => {
    for (const key of keys) bucket.delete(key);
  },
}));

withTestDatabase();

const staff: Actor = {
  id: "000000000000000000000001",
  name: "Marcus Bell",
  email: "marcus@listora.test",
  role: "Moderator",
  owner: false,
  permissions: ["listings.review", "categories.manage"],
};

let dana: UserDoc;
let miguel: UserDoc;
let bikes: string;
let denver: string;

beforeEach(async () => {
  bucket.clear();
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
  const sports = await createCategory(staff, {
    name: "Sports & Outdoors",
    parentId: null,
  });
  bikes = await createCategory(staff, { name: "Bicycles", parentId: sports });
  denver = (
    await Place.create({
      kind: "city",
      key: "denver",
      city: "Denver",
      state: "CO",
      population: 715522,
      point: { type: "Point", coordinates: [-104.8806, 39.7621] },
    })
  ).id as string;
});

// A landscape photo from a phone held upright: EXIF says turn it a quarter.
const phonePhoto = () =>
  sharp({
    create: { width: 2000, height: 1000, channels: 3, background: "#00809e" },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();

const bike = (photoIds: string[]) => ({
  title: "Specialized Allez road bike, 56 cm",
  description: "Aluminum frame, Shimano Claris, new tires last spring.",
  categoryId: bikes,
  price: { mode: "fixed" as const, cents: 62000 },
  attributes: {},
  placeId: denver,
  showPhone: false,
  photoIds,
});

const filesOf = (id: string) => [
  `photos/${id}/thumb.webp`,
  `photos/${id}/full.webp`,
];

describe("uploading a photo", () => {
  it("keeps two upright WebP sizes, without the camera's metadata", async () => {
    const photo = await uploadPhoto(dana, await phonePhoto());

    expect(photo.thumbUrl).toBe(`/api/v1/photos/${photo.id}/thumb`);
    const [thumb, full] = await Promise.all(
      filesOf(photo.id).map((key) => sharp(bucket.get(key)).metadata()),
    );
    expect(thumb).toMatchObject({ format: "webp", width: 320, height: 640 });
    expect(full).toMatchObject({ format: "webp", width: 800, height: 1600 });
    expect(full.exif).toBeUndefined();
    expect(await readPhoto(photo.id, "full")).not.toBeNull();
    expect(await readPhoto(photo.id, "original")).toBeNull();
  });

  it("refuses a file that isn't a photo, and stores nothing", async () => {
    await expect(
      uploadPhoto(dana, Buffer.from("not a photo at all")),
    ).rejects.toMatchObject({ code: "validation" });
    expect(bucket.size).toBe(0);
    expect(await Photo.countDocuments()).toBe(0);
  });
});

describe("photos on a listing", () => {
  it("are claimed in the seller's order, and the first is the cover", async () => {
    const [first, second] = await Promise.all([
      uploadPhoto(dana, await phonePhoto()),
      uploadPhoto(dana, await phonePhoto()),
    ]);
    const listing = await createListing(dana, bike([second.id, first.id]));
    await approveListing(staff, listing.id);

    const seen = await getPublicListing(listing.id);
    expect(seen.photo).toBe(second.thumbUrl);
    expect(seen.photos.map((photo) => photo.id)).toEqual([second.id, first.id]);
  });

  it("can't be someone else's, or already on another listing", async () => {
    const photo = await uploadPhoto(dana, await phonePhoto());

    await expect(createListing(miguel, bike([photo.id]))).rejects.toMatchObject(
      { fields: { photoIds: expect.any(String) } },
    );

    await createListing(dana, bike([photo.id]));
    await expect(createListing(dana, bike([photo.id]))).rejects.toMatchObject({
      fields: { photoIds: expect.any(String) },
    });
  });

  it("leave the bucket when taken off the listing, or with the listing", async () => {
    const [kept, dropped] = await Promise.all([
      uploadPhoto(dana, await phonePhoto()),
      uploadPhoto(dana, await phonePhoto()),
    ]);
    const listing = await createListing(dana, bike([kept.id, dropped.id]));

    await reviseListing(dana, listing.id, bike([kept.id]));
    expect([...bucket.keys()].sort()).toEqual(filesOf(kept.id).sort());

    await deleteListing(dana, listing.id);
    expect(bucket.size).toBe(0);
    expect(await Photo.countDocuments()).toBe(0);
  });
});

it("the scheduled job clears photos that never made it onto a listing", async () => {
  const [posted, forgotten] = await Promise.all([
    uploadPhoto(dana, await phonePhoto()),
    uploadPhoto(dana, await phonePhoto()),
  ]);
  await createListing(dana, bike([posted.id]));

  expect(await removeUnusedPhotos(new Date(Date.now() + 1000))).toBe(1);
  expect([...bucket.keys()].sort()).toEqual(filesOf(posted.id).sort());
  expect(await Photo.exists({ _id: forgotten.id })).toBeNull();
});
