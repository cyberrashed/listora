// The packages on sale, and what the demo sellers bought: enough credits for
// their listings, with payments spread over the last two months.
import { Listing } from "@/server/listings/listing.model";
import { featureListing } from "@/server/listings/listings";
import { Package, Payment } from "@/server/packages/package.model";
import { issueCredits } from "@/server/packages/packages";
import { User } from "@/server/users/user.model";

const DAY = 24 * 60 * 60 * 1000;

const catalog = [
  {
    name: "Seller Plus",
    kind: "listing",
    priceCents: 999,
    quantity: 10,
    days: 30,
    order: 1,
  },
  {
    name: "Seller Pro",
    kind: "listing",
    priceCents: 2499,
    quantity: 30,
    days: 60,
    order: 2,
  },
  {
    name: "Spotlight",
    kind: "featured",
    priceCents: 499,
    quantity: 1,
    days: 30,
    featureDays: 7,
    order: 1,
  },
  {
    name: "Spotlight 5-pack",
    kind: "featured",
    priceCents: 1999,
    quantity: 5,
    days: 60,
    featureDays: 7,
    order: 2,
  },
] as const;

// Who bought what, and how many days ago.
const purchases: [string, string, number][] = [
  ["Dana Whitfield", "Seller Pro", 40],
  ["Miguel Ortega", "Seller Plus", 21],
  ["Tyrone Jefferson", "Seller Plus", 18],
  ["Mei-Ling Chow", "Seller Pro", 33],
  ["Wyatt Lindgren", "Seller Plus", 12],
  ["Luis Navarro", "Seller Plus", 2],
  ["Caleb Nowak", "Seller Plus", 15],
  ["Darnell Okafor", "Seller Plus", 9],
  ["Rachel Steinberg", "Seller Plus", 11],
  ["Aaliyah Simmons", "Seller Plus", 30],
  ["Sofia Marchetti", "Seller Plus", 25],
  ["Hannah Brooks", "Seller Plus", 28],
  ["Dana Whitfield", "Spotlight 5-pack", 6],
  ["Wyatt Lindgren", "Spotlight", 3],
  ["Mei-Ling Chow", "Spotlight", 1],
];

/** Packages, purchases and their credits. Runs before listings are posted. */
export async function seedPackages() {
  const packages = await Package.create([...catalog]);
  const byName = new Map(packages.map((row) => [row.name, row]));

  for (const [name, packageName, daysAgo] of purchases) {
    const customer = (await User.findOne({ name }))!;
    const pkg = byName.get(packageName)!;
    const paidAt = new Date(Date.now() - daysAgo * DAY);
    const payment = await Payment.create({
      userId: customer._id,
      packageId: pkg._id,
      packageName: pkg.name,
      amountCents: pkg.priceCents,
      status: "paid",
      stripeSessionId: `cs_test_seed_${String(customer._id).slice(-6)}${daysAgo}`,
      paidAt,
    });
    await issueCredits(customer._id, pkg.toObject(), "purchase", payment._id);
  }
  return { packages: packages.length, payments: purchases.length };
}

/** A few live listings on top of the market. Runs after listings are approved. */
export async function seedFeatured() {
  const featured = [
    ["Dana Whitfield", "Oak dining table with six chairs"],
    ["Dana Whitfield", "2015 Honda Civic LX, one owner"],
    ["Wyatt Lindgren", "Specialized Allez road bike, 56 cm"],
    ["Mei-Ling Chow", "Dell XPS 15, i7, 32 GB RAM, 1 TB"],
  ];
  for (const [name, title] of featured) {
    const seller = (await User.findOne({ name }))!;
    const listing = await Listing.findOne({ title, status: "active" });
    if (listing) await featureListing(seller, listing.id as string);
  }
  return featured.length;
}
