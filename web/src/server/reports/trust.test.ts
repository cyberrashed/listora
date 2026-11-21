import { beforeEach, describe, expect, it } from "vitest";
import { listActivity } from "../activity/activity";
import { hashPassword } from "../auth/password";
import { createCategory } from "../categories/categories";
import {
  listConversations,
  sendMessage,
  startConversation,
} from "../chat/chat";
import {
  approveListing,
  createListing,
  getListing,
} from "../listings/listings";
import { Notification } from "../notifications/notification.model";
import { Place } from "../places/place.model";
import { listReviews, setReviewHidden, writeReview } from "../reviews/reviews";
import { getSellerProfile } from "../sellers/sellers";
import {
  block,
  follow,
  listFollowing,
  unblock,
  unfollow,
} from "../social/social";
import type { Actor } from "../staff/authorize";
import { withTestDatabase } from "../testing";
import { User, type UserDoc } from "../users/user.model";
import { deleteAccount } from "../users/users";
import {
  decideVerification,
  listVerifications,
  myVerification,
  requestVerification,
} from "../verification/verification";
import { Report } from "./report.model";
import { fileReport, getReport, listReports, resolveReport } from "./reports";

withTestDatabase();

const moderator: Actor = {
  id: "000000000000000000000001",
  name: "Marcus Bell",
  email: "marcus@listora.test",
  role: "Moderator",
  owner: false,
  permissions: [
    "listings.review",
    "categories.manage",
    "customers.manage",
    "reports.handle",
    "reviews.moderate",
    "verification.review",
  ],
};
const owner: Actor = { ...moderator, name: "Priya Raman", owner: true };

let dana: UserDoc;
let miguel: UserDoc;
let hannah: UserDoc;
let civic: string;
let dresser: string;

beforeEach(async () => {
  [dana, miguel, hannah] = await User.create([
    {
      name: "Dana Whitfield",
      email: "dana@mailbox.example",
      passwordHash: "x",
    },
    {
      name: "Miguel Ortega",
      email: "miguel@mailbox.example",
      passwordHash: await hashPassword("a long enough password"),
    },
    {
      name: "Hannah Brooks",
      email: "hannah@mailbox.example",
      passwordHash: "x",
    },
  ]);

  const home = await createCategory(moderator, {
    name: "Home",
    parentId: null,
  });
  const cars = await createCategory(moderator, {
    name: "Cars",
    parentId: null,
  });
  const austin = await Place.create({
    kind: "city",
    key: "austin",
    city: "Austin",
    state: "TX",
    population: 979882,
    point: { type: "Point", coordinates: [-97.7431, 30.2672] },
  });
  const post = async (title: string, categoryId: string) => {
    const { id } = await createListing(dana, {
      title,
      description: "Well looked after and ready to pick up this week.",
      categoryId,
      price: { mode: "fixed", cents: 50000 },
      attributes: {},
      placeId: austin.id as string,
      showPhone: false,
    });
    await approveListing(moderator, id);
    return id;
  };
  civic = await post("2015 Honda Civic LX", cars);
  dresser = await post("Walnut dresser, six drawers", home);
  await Notification.deleteMany();
});

async function talk(buyer: UserDoc, listingId: string) {
  const { id } = await startConversation(buyer, listingId);
  await sendMessage(buyer, id, { text: "Is it still available?" });
  return id;
}

describe("reviews", () => {
  it("come only after talking to the seller, once per listing", async () => {
    const review = {
      listingId: civic,
      rating: 5,
      text: "Exactly as described.",
    };

    await expect(writeReview(miguel, review)).rejects.toMatchObject({
      code: "forbidden",
    });
    await talk(miguel, civic);
    await writeReview(miguel, review);
    await expect(writeReview(miguel, review)).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("keep the seller's rating current, hidden ones left out", async () => {
    await talk(miguel, civic);
    await talk(hannah, civic);
    await writeReview(miguel, { listingId: civic, rating: 5, text: "" });
    const { id } = await writeReview(hannah, {
      listingId: civic,
      rating: 2,
      text: "Never showed up.",
    });

    expect(await User.findById(dana._id).lean()).toMatchObject({
      ratingAverage: 3.5,
      ratingCount: 2,
    });

    await setReviewHidden(moderator, id, true);
    expect(await User.findById(dana._id).lean()).toMatchObject({
      ratingAverage: 5,
      ratingCount: 1,
    });
    expect((await listReviews(moderator, { hidden: true })).items).toHaveLength(
      1,
    );
    expect(
      await Notification.countDocuments({
        userId: dana._id,
        kind: "review_received",
      }),
    ).toBe(2);
  });

  it("leave with the reviewer's account, and the rating follows", async () => {
    await talk(miguel, civic);
    await writeReview(miguel, { listingId: civic, rating: 1, text: "" });

    await deleteAccount(miguel, "a long enough password");

    expect(await User.findById(dana._id).lean()).toMatchObject({
      ratingAverage: 0,
      ratingCount: 0,
    });
  });
});

describe("reports", () => {
  const scam = (id: string) => ({
    kind: "listing" as const,
    id,
    reason: "scam" as const,
    note: "Asked me to pay with gift cards.",
  });

  it("count once per person while open, and never against yourself", async () => {
    await fileReport(miguel, scam(civic));
    await fileReport(miguel, { ...scam(civic), reason: "misleading" });

    expect(await Report.countDocuments()).toBe(1);
    expect(await Report.findOne().lean()).toMatchObject({
      reason: "misleading",
    });
    await expect(fileReport(dana, scam(civic))).rejects.toMatchObject({
      code: "validation",
    });
  });

  it("are worked oldest first and show what they are about", async () => {
    await fileReport(miguel, scam(civic));
    await fileReport(hannah, scam(civic));
    await fileReport(hannah, { ...scam(dresser), reason: "spam" });

    const queue = await listReports(moderator, {});
    expect(queue.counts).toEqual({ open: 3, resolved: 0, dismissed: 0 });
    expect(queue.items[0]).toMatchObject({
      reporterName: "Miguel Ortega",
      reasonLabel: "Looks like a scam",
    });

    expect(await getReport(moderator, queue.items[0].id)).toMatchObject({
      otherOpenReports: 1,
      current: {
        title: "2015 Honda Civic LX",
        owner: { name: "Dana Whitfield" },
      },
      resolutions: ["take_down", "suspend", "dismiss"],
    });
  });

  it("taking a listing down settles every report on it and tells the reporters", async () => {
    await fileReport(miguel, scam(civic));
    await fileReport(hannah, scam(civic));
    const [first] = (await listReports(moderator, {})).items;

    await resolveReport(moderator, first.id, "take_down");

    expect(await getListing(moderator, civic)).toMatchObject({
      status: "rejected",
      rejection: { kind: "permanent" },
    });
    expect(await listReports(moderator, { status: "resolved" })).toMatchObject({
      total: 2,
    });
    expect(await Notification.countDocuments({ kind: "report_resolved" })).toBe(
      2,
    );
    await expect(
      resolveReport(moderator, first.id, "dismiss"),
    ).rejects.toMatchObject({ code: "conflict" });
  });

  it("a review can be hidden, and an account suspended, from a report", async () => {
    await talk(miguel, civic);
    const { id } = await writeReview(miguel, {
      listingId: civic,
      rating: 1,
      text: "Total scammer, call me instead on 512 555 0100.",
    });
    await fileReport(dana, {
      kind: "review",
      id,
      reason: "offensive",
      note: "",
    });
    const [report] = (await listReports(moderator, {})).items;

    await expect(
      resolveReport(moderator, report.id, "take_down"),
    ).rejects.toMatchObject({ code: "validation" });
    await resolveReport(moderator, report.id, "suspend");

    expect(await User.findById(miguel._id).lean()).toMatchObject({
      status: "suspended",
    });
  });

  it("every decision is in the activity log", async () => {
    await fileReport(miguel, scam(civic));
    const [report] = (await listReports(moderator, {})).items;
    await resolveReport(moderator, report.id, "dismiss");

    await expect(listActivity(moderator)).rejects.toMatchObject({
      code: "forbidden",
    });
    const log = await listActivity(owner);
    expect(log.items.map((entry) => entry.action)).toEqual([
      "report.dismissed",
      "listing.approved",
      "listing.approved",
    ]);
    expect(log.items[0]).toMatchObject({
      staffName: "Marcus Bell",
      target: { label: "2015 Honda Civic LX" },
      note: "Looks like a scam. Nothing to do.",
    });
  });
});

describe("blocking", () => {
  it("stops messages both ways until it is lifted", async () => {
    const conversation = await talk(miguel, civic);

    await block(dana, miguel.id as string);

    for (const attempt of [
      () => sendMessage(miguel, conversation, { text: "Hello?" }),
      () => sendMessage(dana, conversation, { text: "Sorry." }),
      () => startConversation(miguel, dresser),
    ]) {
      await expect(attempt()).rejects.toMatchObject({ code: "forbidden" });
    }
    expect((await listConversations(dana, "selling"))[0].other).toMatchObject({
      blocked: true,
    });

    await unblock(dana, miguel.id as string);
    await sendMessage(miguel, conversation, { text: "Hello again." });
  });
});

describe("seller profiles", () => {
  it("show listings, reviews, followers and what the viewer may review", async () => {
    await talk(miguel, civic);
    await talk(miguel, dresser);
    await writeReview(miguel, {
      listingId: civic,
      rating: 4,
      text: "Smooth sale.",
    });
    await follow(miguel, dana.id as string);
    await follow(hannah, dana.id as string);

    const profile = await getSellerProfile(miguel, dana.id as string);

    expect(profile).toMatchObject({
      name: "Dana Whitfield",
      verified: false,
      rating: { average: 4, count: 1 },
      followers: 2,
      following: true,
      reviews: [{ rating: 4, reviewerName: "Miguel Ortega" }],
      reviewable: [{ id: dresser, title: "Walnut dresser, six drawers" }],
    });
    expect(profile.listings).toHaveLength(2);
    expect((await getSellerProfile(null, dana.id as string)).following).toBe(
      false,
    );

    await unfollow(miguel, dana.id as string);
    expect(await listFollowing(miguel)).toEqual([]);
    await expect(follow(dana, dana.id as string)).rejects.toMatchObject({
      code: "validation",
    });
  });
});

describe("verification", () => {
  const request = {
    legalName: "Dana Marie Whitfield",
    phone: "+1 512 555 0142",
    about: "I sell furniture I restore in my garage in East Austin.",
  };

  it("is asked for once at a time and approved by staff", async () => {
    await requestVerification(dana, request);
    await expect(requestVerification(dana, request)).rejects.toMatchObject({
      code: "conflict",
    });

    const [pending] = (await listVerifications(moderator, {})).items;
    await decideVerification(moderator, pending.id, { approve: true });

    const fresh = (await User.findById(dana._id))!;
    expect(await myVerification(fresh)).toMatchObject({
      verified: true,
      request: { status: "approved" },
    });
    expect(
      await Notification.findOne({ kind: "verification_decided" }).lean(),
    ).toMatchObject({ title: "You're verified" });
  });

  it("can be turned down with a reason and asked for again", async () => {
    await requestVerification(dana, request);
    const [pending] = (await listVerifications(moderator, {})).items;

    await decideVerification(moderator, pending.id, {
      approve: false,
      reason: "The phone number didn't answer.",
    });

    expect(await myVerification(dana)).toMatchObject({
      verified: false,
      request: {
        status: "rejected",
        reason: "The phone number didn't answer.",
      },
    });
    await requestVerification(dana, request);
  });
});
