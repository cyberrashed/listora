// Home-screen banners, help pages and blog posts for the demo.
import { Category } from "@/server/categories/category.model";
import { Banner, Page, Post } from "@/server/content/content.model";

const DAY = 24 * 60 * 60 * 1000;

const faq: [string, string][] = [
  [
    "Is posting a listing free?",
    "Every account posts three listings a month for free. If you sell more than that, a listing package gives you more for 30 or 60 days.",
  ],
  [
    "Why is my listing waiting for review?",
    "Our team reads every listing before it goes live, usually within a day. You get a notification as soon as it is approved, or a note on what to change if it isn't.",
  ],
  [
    "How long does a listing stay up?",
    "30 days. A few days before it ends you get a reminder, and you can renew it from the Selling tab once it has ended.",
  ],
  [
    "What does Featured do?",
    "A featured listing shows in the Featured row at the top of Browse for seven days, so more buyers see it first.",
  ],
  [
    "How do offers work?",
    "In a chat about a listing, the buyer can offer a price. The seller accepts or declines, and both of you see the answer in the chat. Payment and pickup happen between you.",
  ],
  [
    "What does the verified badge mean?",
    "The seller sent us their legal name, phone number and how they sell, and our team checked it. It is not a guarantee, so the usual safety tips still apply.",
  ],
];

const pages: [string, string, string][] = [
  [
    "About Listora",
    "about",
    "Listora is a local marketplace for buying and selling used things with people near you.\n\nEvery listing is read by a person before it goes live, sellers can be verified, and buyers review the sellers they deal with. We keep it simple: you talk, agree on a price and meet up.",
  ],
  [
    "Safety tips",
    "safety-tips",
    "Meet in a busy public place during the day. Many police stations have a safe exchange spot with cameras.\n\nBring a friend if you can, and tell someone where you are going.\n\nLook the item over before you pay. For phones and electronics, turn them on and check they aren't locked to another account.\n\nPay in person. Never send a deposit, a gift card or a wire transfer to someone you haven't met, and never share a code sent to your phone.\n\nIf something feels wrong, walk away and report the listing or the person from the app.",
  ],
  [
    "Terms of use",
    "terms",
    "By using Listora you agree to post only things you own and are allowed to sell, to describe them honestly and to treat other members with respect.\n\nWe may remove a listing or suspend an account that breaks these rules. Sales are between buyer and seller; Listora is not a party to them.",
  ],
  [
    "Privacy",
    "privacy",
    "We keep the details you give us to run your account: your name, email, phone number if you add one, and what you post.\n\nBuyers see your name, your city and your phone number only if you choose to show it on a listing. We never show your exact location.",
  ],
];

const posts: [string, string, string, number][] = [
  [
    "Five rules for a safe meetup",
    "Where to meet, when to go and what to check before any money changes hands.",
    "Most sales go smoothly, and a few simple habits keep it that way.\n\nPick a busy public place, in daylight. Coffee shops and store parking lots work, and many police stations have a marked safe exchange spot.\n\nBring someone along, or at least tell a friend where you are going and when you expect to be back.\n\nCheck the item before you pay. Turn electronics on, test drive cars, open drawers.\n\nPay in person, in a way you are comfortable with. Anyone who asks for a deposit up front, a gift card or a code sent to your phone is not someone to deal with.",
    3,
  ],
  [
    "How to price a used car to sell in a week",
    "Start from what similar cars actually sold for, not what they are listed at.",
    "Search Listora for the same make, model and year near you, and note the asking prices of the ones marked sold.\n\nAdjust for mileage and condition, and be honest about both in the listing. A clear note about a dent or a slipping gear brings serious buyers and saves you wasted trips.\n\nIf you'd take a little less, choose 'or best offer'. Buyers can then send you an offer right in the chat.",
    10,
  ],
  [
    "Photos that sell furniture",
    "Natural light, a clear floor and one shot of every flaw.",
    "Move the piece away from the wall and shoot it in daylight, from a little above eye level.\n\nShow the drawers open, the back and the legs. A close-up of the one scratch tells buyers you have nothing to hide.\n\nAdd the measurements to the description. 'Does it fit?' is the first question every buyer asks.",
    21,
  ],
];

export async function seedContent() {
  const bikes = await Category.findOne({ name: "Bikes" }).lean();
  const cars = await Category.findOne({ name: "Cars & Trucks" }).lean();

  await Banner.create([
    {
      title: "Sell it this weekend",
      body: "Your first three listings each month are free.",
      link: "post",
      order: 1,
    },
    {
      title: "Bikes for spring",
      body: "Road, mountain and electric bikes from riders near you.",
      link: "category",
      target: bikes ? String(bikes._id) : undefined,
      order: 2,
    },
    {
      title: "Clean titles only",
      body: "Cars and trucks with the paperwork in order.",
      link: "category",
      target: cars ? String(cars._id) : undefined,
      order: 3,
    },
  ]);

  await Page.create([
    ...faq.map(([title, body], index) => ({
      kind: "faq" as const,
      title,
      slug: `faq-${index + 1}`,
      body,
      order: index + 1,
    })),
    ...pages.map(([title, slug, body], index) => ({
      kind: "page" as const,
      title,
      slug,
      body,
      order: index + 1,
    })),
  ]);

  await Post.create(
    posts.map(([title, excerpt, body, daysAgo]) => ({
      title,
      slug: title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      excerpt,
      body,
      published: true,
      publishedAt: new Date(Date.now() - daysAgo * DAY),
    })),
  );

  return { banners: 3, pages: faq.length + pages.length, posts: posts.length };
}
