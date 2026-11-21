// Demo conversations, reviews, reports, follows and verification requests,
// made through the same services the app and the dashboard use.
import {
  answerOffer,
  makeOffer,
  sendMessage,
  startConversation,
} from "@/server/chat/chat";
import { Listing } from "@/server/listings/listing.model";
import { fileReport } from "@/server/reports/reports";
import { Review } from "@/server/reviews/review.model";
import { writeReview } from "@/server/reviews/reviews";
import { follow } from "@/server/social/social";
import type { Actor } from "@/server/staff/authorize";
import { User } from "@/server/users/user.model";
import {
  decideVerification,
  requestVerification,
} from "@/server/verification/verification";
import { Verification } from "@/server/verification/verification.model";

type Line = [who: "buyer" | "seller", text: string];

type ChatSeed = {
  buyer: string;
  listing: string;
  lines: Line[];
  review?: { rating: number; text: string };
};

const chats: ChatSeed[] = [
  {
    buyer: "Hannah Brooks",
    listing: "Specialized Allez road bike, 56 cm",
    lines: [
      ["buyer", "Hi! Would this fit someone about 5'10\"?"],
      ["seller", "Yes, I'm 5'11\" and it fits me well."],
      ["buyer", "Great. Could I see it Thursday evening?"],
      ["seller", "Thursday after 6 works. I'm near Cherry Creek."],
    ],
    review: {
      rating: 5,
      text: "Bike was exactly as described and Wyatt adjusted the saddle for me before I rode off.",
    },
  },
  {
    buyer: "Luis Navarro",
    listing: "Dell XPS 15, i7, 32 GB RAM, 1 TB",
    lines: [
      ["buyer", "Does the screen have any dead pixels?"],
      ["seller", "None. I can send a photo of a white screen if you like."],
      ["buyer", "That's fine, I'll check when I pick it up."],
    ],
    review: {
      rating: 4,
      text: "Laptop is in great shape. Took a few days to set up a time, but worth it.",
    },
  },
  {
    buyer: "Rachel Steinberg",
    listing: "DeWalt 20V drill and impact driver set",
    lines: [
      ["buyer", "Are both batteries the 2Ah ones?"],
      ["seller", "One 2Ah and one 5Ah. The 5Ah lasts all day."],
      ["buyer", "Perfect, I'll take it."],
    ],
    review: { rating: 5, text: "Easy pickup, tools work perfectly." },
  },
  {
    buyer: "Caleb Nowak",
    listing: "Oak dining table with six chairs",
    lines: [
      ["buyer", "Can the leaf be stored under the table?"],
      ["seller", "It slides in underneath, yes."],
      ["buyer", "I'll bring a trailer on Sunday."],
    ],
    review: {
      rating: 3,
      text: "Table is solid. Pickup was an hour later than we agreed.",
    },
  },
  {
    buyer: "Darnell Okafor",
    listing: "Sonos Beam soundbar, second gen",
    lines: [
      ["buyer", "Is it still registered to your Sonos account?"],
      ["seller", "I removed it this morning, so it's ready to set up."],
    ],
    review: { rating: 5, text: "Friendly and quick. Soundbar works great." },
  },
  {
    buyer: "Aaliyah Simmons",
    listing: "Yamaha P-125 digital piano with stand",
    lines: [
      ["buyer", "Would you take $400?"],
      [
        "seller",
        "Sorry, $520 is already a good price for everything included.",
      ],
      ["buyer", "Fine."],
    ],
    review: {
      rating: 1,
      text: "Rude seller, wouldn't budge at all. Don't bother, text me at 404 555 0127 and I'll sell you mine cheaper.",
    },
  },
  {
    buyer: "Miguel Ortega",
    listing: "2015 Honda Civic LX, one owner",
    lines: [
      ["buyer", "Hi Dana, is the Civic still available?"],
      ["seller", "It is! Do you want to come see it this weekend?"],
      ["buyer", "Saturday morning works. Any issues I should know about?"],
      ["seller", "None. Service records are in the glovebox."],
    ],
  },
];

export async function seedTrust(staff: Actor) {
  const people = new Map(
    (await User.find()).map((person) => [person.name, person]),
  );
  const person = (name: string) => people.get(name)!;
  let reviews = 0;
  const conversations = new Map<string, string>();

  for (const chat of chats) {
    const listing = await Listing.findOne({
      title: chat.listing,
      status: "active",
    });
    if (!listing) continue;
    const buyer = person(chat.buyer);
    const seller = (await User.findById(listing.sellerId))!;

    const { id } = await startConversation(buyer, listing.id as string);
    conversations.set(chat.listing, id);
    for (const [who, text] of chat.lines) {
      await sendMessage(who === "buyer" ? buyer : seller, id, { text });
    }
    if (chat.review) {
      await writeReview(buyer, {
        listingId: listing.id as string,
        ...chat.review,
      });
      reviews++;
    }
  }

  // An offer turned down, then a better one waiting for Dana.
  const civic = conversations.get("2015 Honda Civic LX, one owner")!;
  await makeOffer(person("Miguel Ortega"), civic, { cents: 800000 });
  await answerOffer(person("Dana Whitfield"), civic, { accept: false });
  await makeOffer(person("Miguel Ortega"), civic, { cents: 850000 });

  // The review with a phone number in it is reported by the seller.
  const piano = await Listing.findOne({
    title: "Yamaha P-125 digital piano with stand",
  });
  const rude = await Review.findOne({ listingId: piano?._id });
  if (rude) {
    await fileReport(person("Miguel Ortega"), {
      kind: "review",
      id: rude.id as string,
      reason: "offensive",
      note: "Calls me rude and posts a phone number to pull buyers away.",
    });
  }
  const nintendo = await Listing.findOne({
    title: "Nintendo Switch OLED, white",
  });
  if (nintendo) {
    for (const [reporter, note] of [
      [
        "Luis Navarro",
        "In chat the seller said it's the original model, not the OLED.",
      ],
      ["Rachel Steinberg", "Same photos as a listing I saw last month."],
    ]) {
      await fileReport(person(reporter), {
        kind: "listing",
        id: nintendo.id as string,
        reason: "misleading",
        note,
      });
    }
  }
  await fileReport(person("Sofia Marchetti"), {
    kind: "user",
    id: person("Caleb Nowak").id as string,
    reason: "spam",
    note: "Sent me the same message about a crypto deal three times.",
  });

  // Sellers others follow.
  for (const [follower, seller] of [
    ["Hannah Brooks", "Wyatt Lindgren"],
    ["Luis Navarro", "Mei-Ling Chow"],
    ["Miguel Ortega", "Dana Whitfield"],
    ["Rachel Steinberg", "Dana Whitfield"],
    ["Caleb Nowak", "Dana Whitfield"],
    ["Darnell Okafor", "Sofia Marchetti"],
  ]) {
    await follow(person(follower), person(seller).id as string);
  }

  // Two verified sellers and two waiting.
  const about: Record<string, string> = {
    "Dana Whitfield":
      "I sell furniture I restore in my garage, plus the odd car when we upgrade.",
    "Wyatt Lindgren":
      "Bikes and outdoor gear. I ride a lot and sell what I've outgrown.",
    "Mei-Ling Chow":
      "Electronics from my design work and things I no longer need at home.",
    "Darnell Okafor":
      "Mostly electronics and fishing gear from around Atlanta.",
  };
  for (const [name, text] of Object.entries(about)) {
    const seller = person(name);
    await requestVerification(seller, {
      legalName: name,
      phone: seller.phone ?? "+1 555 555 0100",
      about: text,
    });
  }
  for (const name of ["Dana Whitfield", "Wyatt Lindgren"]) {
    const request = await Verification.findOne({ userId: person(name)._id });
    await decideVerification(staff, request!.id as string, { approve: true });
  }

  return { conversations: conversations.size, reviews };
}
