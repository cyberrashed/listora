// Resets the database to a known demo state.
//
//   npm run seed
import mongoose from "mongoose";
import { Activity } from "@/server/activity/activity.model";
import { hashPassword } from "@/server/auth/password";
import { createCategory } from "@/server/categories/categories";
import { Category, CustomField } from "@/server/categories/category.model";
import { connectDb } from "@/server/db";
import { Listing } from "@/server/listings/listing.model";
import {
  approveListing,
  createListing,
  markListingSold,
  rejectListing,
} from "@/server/listings/listings";
import { loadPlaces } from "@/server/places/load";
import { Place } from "@/server/places/place.model";
import type { Actor } from "@/server/staff/authorize";
import { Role, Staff } from "@/server/staff/staff.model";
import { User } from "@/server/users/user.model";
import { catalog, type CategorySeed } from "./catalog";
import { seedContent } from "./content";
import { listings } from "./listings";
import { seedFeatured, seedPackages } from "./packages";
import { seedTrust } from "./trust";

const password = process.env.SEED_PASSWORD;
if (!password) throw new Error("Set SEED_PASSWORD in .env.local first.");

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);

const customers = [
  {
    name: "Dana Whitfield",
    email: "dana.whitfield@mailbox.example",
    phone: "+1 512 555 0142",
    joined: 212,
  },
  {
    name: "Miguel Ortega",
    email: "miguel.ortega@postbox.example",
    phone: "+1 512 555 0178",
    joined: 187,
  },
  { name: "Hannah Brooks", email: "hannah.brooks@inbox.example", joined: 164 },
  {
    name: "Tyrone Jefferson",
    email: "tyrone.jefferson@mailbox.example",
    phone: "+1 303 555 0119",
    joined: 151,
  },
  {
    name: "Mei-Ling Chow",
    email: "meiling.chow@postbox.example",
    phone: "+1 206 555 0163",
    joined: 133,
  },
  { name: "Caleb Nowak", email: "caleb.nowak@inbox.example", joined: 98 },
  {
    name: "Aaliyah Simmons",
    email: "aaliyah.simmons@mailbox.example",
    phone: "+1 404 555 0127",
    joined: 76,
  },
  {
    name: "Wyatt Lindgren",
    email: "wyatt.lindgren@postbox.example",
    joined: 54,
  },
  {
    name: "Sofia Marchetti",
    email: "sofia.marchetti@inbox.example",
    phone: "+1 615 555 0191",
    joined: 41,
  },
  {
    name: "Darnell Okafor",
    email: "darnell.okafor@mailbox.example",
    joined: 23,
  },
  {
    name: "Rachel Steinberg",
    email: "rachel.steinberg@postbox.example",
    phone: "+1 303 555 0156",
    joined: 9,
  },
  { name: "Luis Navarro", email: "luis.navarro@inbox.example", joined: 2 },
  // Suspended for posting the same scam listing in every city.
  {
    name: "Brandon Hayes",
    email: "brandon.hayes@inbox.example",
    joined: 30,
    status: "suspended",
  },
] as const;

// The services check who is acting. The seed acts as an owner.
// Reviews and other decisions in the demo are made as the demo moderator,
// so the activity log reads like real work.
let seeder: Actor;

async function seedCatalog() {
  // One field per label, attached to every category that names it.
  const fields = new Map<string, { categoryIds: string[]; order: number }>();
  let categories = 0;

  const add = async (items: CategorySeed[], parentId: string | null) => {
    for (const item of items) {
      const id = await createCategory(seeder, { name: item.name, parentId });
      categories++;

      for (const field of item.fields ?? []) {
        const known = fields.get(field.label) ?? {
          ...field,
          categoryIds: [],
          order: fields.size + 1,
        };
        known.categoryIds.push(id);
        fields.set(field.label, known);
      }
      await add(item.children ?? [], id);
    }
  };
  await add(catalog, null);

  await CustomField.create([...fields.values()]);
  return { categories, fields: fields.size };
}

// Listings go through the same services a seller and a moderator use, then
// their dates are moved back so the queue and the market have some history.
async function seedListings() {
  const [fields, categories] = await Promise.all([
    CustomField.find().lean(),
    Category.find().lean(),
  ]);
  const fieldId = (label: string) =>
    String(fields.find((field) => field.label === label)!._id);

  for (const item of listings) {
    const seller = (await User.findOne({ email: item.seller }))!;
    const category = categories.find((row) => row.name === item.category)!;
    const [city, state] = item.city.split(", ");
    const place = (await Place.findOne({ kind: "city", city, state }).lean())!;

    const { id } = await createListing(seller, {
      title: item.title,
      description: item.description,
      categoryId: String(category._id),
      price: item.price,
      attributes: Object.fromEntries(
        Object.entries(item.answers ?? {}).map(([label, value]) => [
          fieldId(label),
          value,
        ]),
      ),
      placeId: String(place._id),
      showPhone: Boolean(seller.phone),
    });

    const live = item.fate === "approved" || item.fate === "sold";
    if (live) await approveListing(seeder, id);
    if (item.fate === "sold") await markListingSold(seller, id);
    if (typeof item.fate === "object") {
      await rejectListing(seeder, id, {
        kind: item.fate.rejected,
        reason: item.fate.reason,
      });
    }

    const posted = daysAgo(item.daysAgo);
    const reviewed = new Date(posted.getTime() + 2 * 60 * 60 * 1000);
    await Listing.updateOne(
      { _id: id },
      {
        createdAt: posted,
        submittedAt: posted,
        ...(live && {
          publishedAt: reviewed,
          expiresAt: new Date(reviewed.getTime() + 30 * DAY),
        }),
      },
      { timestamps: false, overwriteImmutable: true },
    );
    // The decision is logged when it was made, not when the seed ran.
    await Activity.updateMany(
      { "target.id": id },
      { createdAt: reviewed },
      { timestamps: false, overwriteImmutable: true },
    );
  }
  return listings.length;
}

async function seed() {
  const { connection } = await connectDb();
  await connection.dropDatabase();
  // A running server built its indexes when it started, against the old
  // database. Build them again here, or text and map searches fail.
  await connection.syncIndexes();

  const passwordHash = await hashPassword(password!);

  const [owner, moderator, support] = await Role.create([
    { name: "Owner", owner: true },
    {
      name: "Moderator",
      permissions: [
        "listings.review",
        "customers.view",
        "customers.manage",
        "reports.handle",
        "reviews.moderate",
        "verification.review",
      ],
    },
    {
      name: "Support",
      permissions: ["customers.view", "emails.view", "payments.view"],
    },
  ]);

  const [, marcus] = await Staff.create([
    {
      name: "Priya Raman",
      email: "priya.raman@listora.test",
      passwordHash,
      roleId: owner._id,
    },
    {
      name: "Marcus Bell",
      email: "marcus.bell@listora.test",
      passwordHash,
      roleId: moderator._id,
    },
    {
      name: "Elena Vasquez",
      email: "elena.vasquez@listora.test",
      passwordHash,
      roleId: support._id,
    },
  ]);

  await User.insertMany(
    customers.map(({ joined, ...customer }) => ({
      ...customer,
      passwordHash,
      createdAt: daysAgo(joined),
      updatedAt: daysAgo(joined),
    })),
    { timestamps: false },
  );

  seeder = {
    id: marcus.id as string,
    name: marcus.name,
    email: marcus.email,
    role: "Moderator",
    owner: true,
    permissions: [],
  };

  const catalogCounts = await seedCatalog();
  const places = await loadPlaces();
  const sales = await seedPackages();
  const listingCount = await seedListings();
  const featured = await seedFeatured();
  const trust = await seedTrust(seeder);
  const content = await seedContent();

  console.log(
    [
      `Seeded 3 roles, 3 staff and ${customers.length} customers,`,
      `${catalogCounts.categories} categories with ${catalogCounts.fields} fields,`,
      `${places.cities} cities and ${places.zips} ZIP codes,`,
      `${listingCount} listings,`,
      `${featured} of them featured,`,
      `${sales.packages} packages and ${sales.payments} payments,`,
      `${trust.conversations} conversations, ${trust.reviews} reviews,`,
      `${content.banners} banners, ${content.pages} help pages and ${content.posts} blog posts.`,
      "Every seeded account signs in with SEED_PASSWORD.",
    ].join(" "),
  );
}

seed()
  .finally(() => mongoose.disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
