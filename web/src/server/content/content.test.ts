import { beforeEach, describe, expect, it } from "vitest";
import { listActivity } from "../activity/activity";
import { createCategory } from "../categories/categories";
import { createListing } from "../listings/listings";
import { Notification } from "../notifications/notification.model";
import { Place } from "../places/place.model";
import { appConfig, getSettings, updateSettings } from "../settings/settings";
import type { Actor } from "../staff/authorize";
import { withTestDatabase } from "../testing";
import { User } from "../users/user.model";
import {
  bannerInput,
  deleteBanner,
  getPublishedPage,
  getPublishedPost,
  helpContent,
  homeContent,
  listBanners,
  listPublishedPosts,
  moveBanner,
  saveBanner,
  savePage,
  savePost,
  sendAnnouncement,
} from "./content";
import { Post } from "./content.model";

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

const settings = {
  freeListingsPerMonth: 3,
  maintenance: false,
  maintenanceMessage:
    "Listora is down for a short update. Try again in a few minutes.",
  minAppVersion: "0.1.0",
  supportEmail: "help@listora.example",
};

describe("settings", () => {
  it("start from defaults and log what changed", async () => {
    expect(await getSettings()).toEqual(settings);

    await updateSettings(owner, {
      ...settings,
      maintenance: true,
      minAppVersion: "0.2.0",
    });

    expect(await appConfig()).toMatchObject({
      maintenance: true,
      minAppVersion: "0.2.0",
    });
    const [entry] = (await listActivity(owner)).items;
    expect(entry).toMatchObject({
      action: "settings.changed",
      note: "Maintenance, Oldest app allowed",
    });
    await expect(updateSettings(support, settings)).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("set how many listings are free each month", async () => {
    await updateSettings(owner, { ...settings, freeListingsPerMonth: 1 });
    const dana = await User.create({
      name: "Dana Whitfield",
      email: "dana@mailbox.example",
      passwordHash: "x",
    });
    const home = await createCategory(owner, { name: "Home", parentId: null });
    const austin = await Place.create({
      kind: "city",
      key: "austin",
      city: "Austin",
      state: "TX",
      population: 979882,
      point: { type: "Point", coordinates: [-97.7431, 30.2672] },
    });
    const post = () =>
      createListing(dana, {
        title: "Walnut dresser, six drawers",
        description: "Well looked after and ready to pick up this week.",
        categoryId: home,
        price: { mode: "fixed", cents: 42000 },
        attributes: {},
        placeId: austin.id as string,
        showPhone: false,
      });

    await post();
    await expect(post()).rejects.toMatchObject({
      code: "payment_required",
      message: expect.stringContaining("your 1 free listings"),
    });
  });
});

describe("banners", () => {
  const banner = {
    title: "Sell it in minutes",
    body: "Your first listings each month are free.",
    link: "post" as const,
    target: "",
    active: true,
  };

  it("show on the home screen while active, in their order", async () => {
    await saveBanner(owner, null, banner);
    await saveBanner(owner, null, {
      ...banner,
      title: "Bikes for spring",
      link: "search",
      target: "bike",
    });
    await saveBanner(owner, null, {
      ...banner,
      title: "Hidden one",
      active: false,
    });

    expect((await homeContent()).banners.map((row) => row.title)).toEqual([
      "Sell it in minutes",
      "Bikes for spring",
    ]);

    const [first] = await listBanners(owner);
    await moveBanner(owner, first.id, 1);
    expect((await homeContent()).banners[0]).toMatchObject({
      title: "Bikes for spring",
      target: "bike",
    });

    await deleteBanner(owner, first.id);
    expect(await listBanners(owner)).toHaveLength(2);
  });

  it("need somewhere to lead when they link", () => {
    expect(
      bannerInput.safeParse({ ...banner, link: "category", target: "cars" })
        .success,
    ).toBe(false);
    expect(
      bannerInput.safeParse({ ...banner, link: "search", target: "" }).success,
    ).toBe(false);
  });
});

describe("help pages", () => {
  it("show what is published, under an address made from the title", async () => {
    await savePage(owner, null, {
      kind: "page",
      title: "Safety tips",
      slug: "",
      body: "Meet in a public place and bring a friend.",
      published: true,
    });
    await savePage(owner, null, {
      kind: "faq",
      title: "Is posting free?",
      slug: "",
      body: "Your first three listings each month are.",
      published: true,
    });
    await savePage(owner, null, {
      kind: "faq",
      title: "A draft question",
      slug: "",
      body: "Not ready for anyone to read.",
      published: false,
    });

    expect(await helpContent()).toMatchObject({
      faq: [{ question: "Is posting free?" }],
      pages: [{ slug: "safety-tips", title: "Safety tips" }],
    });
    expect(await getPublishedPage("safety-tips")).toMatchObject({
      title: "Safety tips",
    });
    await expect(getPublishedPage("a-draft-question")).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("can't share an address", async () => {
    const page = {
      kind: "page" as const,
      title: "Terms of use",
      slug: "terms",
      body: "The rules for using Listora.",
      published: true,
    };
    await savePage(owner, null, page);

    await expect(savePage(owner, null, page)).rejects.toMatchObject({
      code: "conflict",
      fields: { slug: expect.any(String) },
    });
  });
});

describe("the blog", () => {
  const post = {
    title: "Five rules for a safe meetup",
    slug: "",
    excerpt: "Where to meet, when to go and what to bring.",
    body: "Pick a busy public place. Police stations often have a safe exchange spot outside, with cameras.",
    published: false,
  };

  it("shows posts once published, keeping the first publish date", async () => {
    await savePost(owner, null, post);
    expect(await listPublishedPosts()).toEqual([]);

    const draft = (await Post.findOne().lean())!;
    await savePost(owner, String(draft._id), { ...post, published: true });
    const first = (await Post.findById(draft._id).lean())!.publishedAt;
    await savePost(owner, String(draft._id), {
      ...post,
      published: true,
      title: "Six rules for a safe meetup",
    });

    const [card] = await listPublishedPosts();
    expect(card).toMatchObject({ slug: "five-rules-for-a-safe-meetup" });
    expect(card).not.toHaveProperty("body");
    expect((await Post.findById(draft._id).lean())!.publishedAt).toEqual(first);
    expect((await getPublishedPost("five-rules-for-a-safe-meetup")).title).toBe(
      "Six rules for a safe meetup",
    );
  });
});

describe("announcements", () => {
  beforeEach(async () => {
    await User.create([
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
      {
        name: "Brandon Hayes",
        email: "brandon@inbox.example",
        passwordHash: "x",
        status: "suspended",
      },
    ]);
  });

  const notice = {
    title: "Holiday hours",
    body: "Listings posted on the 24th are reviewed on the 26th.",
    email: "",
  };

  it("reach every active customer, or just one", async () => {
    expect(await sendAnnouncement(owner, notice)).toBe(2);
    expect(await Notification.countDocuments({ kind: "announcement" })).toBe(2);

    expect(
      await sendAnnouncement(owner, {
        ...notice,
        email: "Dana@mailbox.example",
      }),
    ).toBe(1);
    await expect(
      sendAnnouncement(owner, { ...notice, email: "brandon@inbox.example" }),
    ).rejects.toMatchObject({ code: "validation" });

    const [entry] = (await listActivity(owner)).items;
    expect(entry).toMatchObject({
      action: "announcement.sent",
      note: "To Dana@mailbox.example",
    });
  });
});
