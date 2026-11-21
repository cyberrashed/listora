import "server-only";
import { Types } from "mongoose";
import { z } from "zod";
import { record } from "../activity/activity";
import { connectDb, isObjectId } from "../db";
import { AppError } from "../errors";
import { Notification } from "../notifications/notification.model";
import { type Actor, authorize } from "../staff/authorize";
import { User } from "../users/user.model";
import {
  Banner,
  type BannerFields,
  bannerLinks,
  Page,
  type PageFields,
  Post,
  type PostFields,
} from "./content.model";

const slug = z
  .string()
  .trim()
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$|^$/, "Use lowercase words and hyphens.");

/** "Safe meetups: 5 rules" becomes "safe-meetups-5-rules". */
function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const missing = (what: string) =>
  new AppError("not_found", `That ${what} no longer exists.`);

const taken = () =>
  new AppError("conflict", "Another one already uses that address.", {
    slug: "Another one already uses that address.",
  });

// A duplicate slug surfaces as a database error; this turns it into a field.
async function unique<T>(save: () => Promise<T>) {
  try {
    return await save();
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw taken();
    throw error;
  }
}

export const bannerInput = z
  .object({
    title: z.string().trim().min(3, "Give it a title.").max(60),
    body: z.string().trim().max(140, "Use 140 characters or fewer."),
    link: z.enum(bannerLinks),
    target: z.string().trim().max(80),
    active: z.boolean(),
  })
  .refine(
    (banner) => !["category", "search"].includes(banner.link) || banner.target,
    {
      path: ["target"],
      message: "Say where it leads.",
    },
  )
  .refine((banner) => banner.link !== "category" || isObjectId(banner.target), {
    path: ["target"],
    message: "Choose a category.",
  });

function toBannerDto(row: BannerFields & { _id: unknown }) {
  return {
    id: String(row._id),
    title: row.title,
    body: row.body,
    link: row.link,
    target: row.target ?? null,
    active: row.active,
  };
}

/** What the app's home screen shows above the categories. */
export async function homeContent() {
  await connectDb();
  const banners = await Banner.find({ active: true }).sort({ order: 1 }).lean();
  return { banners: banners.map(toBannerDto) };
}

export async function listBanners(actor: Actor) {
  authorize(actor, "content.manage");
  await connectDb();
  return (await Banner.find().sort({ order: 1 }).lean()).map(toBannerDto);
}

export async function getBanner(actor: Actor, id: string) {
  authorize(actor, "content.manage");
  await connectDb();
  const row = isObjectId(id) ? await Banner.findById(id).lean() : null;
  if (!row) throw missing("banner");
  return toBannerDto(row);
}

export async function saveBanner(
  actor: Actor,
  id: string | null,
  input: z.infer<typeof bannerInput>,
) {
  authorize(actor, "content.manage");
  await connectDb();
  const fields = {
    ...input,
    target:
      input.link === "none" || input.link === "post" ? undefined : input.target,
  };

  if (!id) {
    const last = await Banner.findOne().sort({ order: -1 }).lean();
    await Banner.create({ ...fields, order: (last?.order ?? 0) + 1 });
    return;
  }
  const row = isObjectId(id)
    ? await Banner.findByIdAndUpdate(id, fields)
    : null;
  if (!row) throw missing("banner");
}

/** Swaps a banner with the one before or after it. */
export async function moveBanner(actor: Actor, id: string, by: -1 | 1) {
  authorize(actor, "content.manage");
  await connectDb();

  const rows = await Banner.find().sort({ order: 1 });
  const index = rows.findIndex((row) => row.id === id);
  const other = rows[index + by];
  if (index < 0 || !other) return;
  const banner = rows[index];
  await Banner.bulkWrite([
    {
      updateOne: {
        filter: { _id: banner._id },
        update: { order: other.order },
      },
    },
    {
      updateOne: {
        filter: { _id: other._id },
        update: { order: banner.order },
      },
    },
  ]);
}

export async function deleteBanner(actor: Actor, id: string) {
  authorize(actor, "content.manage");
  await connectDb();
  if (isObjectId(id)) await Banner.deleteOne({ _id: id });
}

export const pageInput = z.object({
  kind: z.enum(["faq", "page"]),
  title: z.string().trim().min(3, "Give it a title.").max(120),
  slug,
  body: z.string().trim().min(10, "Write a little more.").max(20_000),
  published: z.boolean(),
});

function toPageDto(row: PageFields & { _id: unknown }) {
  return {
    id: String(row._id),
    kind: row.kind,
    title: row.title,
    slug: row.slug,
    body: row.body,
    published: row.published,
  };
}

/** Questions with their answers, and the list of longer pages. */
export async function helpContent() {
  await connectDb();
  const rows = await Page.find({ published: true })
    .sort({ kind: 1, order: 1 })
    .lean();
  return {
    faq: rows
      .filter((row) => row.kind === "faq")
      .map((row) => ({
        id: String(row._id),
        question: row.title,
        answer: row.body,
      })),
    pages: rows
      .filter((row) => row.kind === "page")
      .map((row) => ({ slug: row.slug, title: row.title })),
  };
}

export async function getPublishedPage(pageSlug: string) {
  await connectDb();
  const row = await Page.findOne({ slug: pageSlug, published: true }).lean();
  if (!row) throw missing("page");
  return {
    slug: row.slug,
    title: row.title,
    body: row.body,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listPages(actor: Actor) {
  authorize(actor, "content.manage");
  await connectDb();
  return (await Page.find().sort({ kind: 1, order: 1 }).lean()).map(toPageDto);
}

export async function getPage(actor: Actor, id: string) {
  authorize(actor, "content.manage");
  await connectDb();
  const row = isObjectId(id) ? await Page.findById(id).lean() : null;
  if (!row) throw missing("page");
  return toPageDto(row);
}

export async function savePage(
  actor: Actor,
  id: string | null,
  input: z.infer<typeof pageInput>,
) {
  authorize(actor, "content.manage");
  await connectDb();
  // Left empty, a new page's address comes from its title; an existing page
  // keeps the one it has, so links to it keep working.
  const { slug: typed, ...rest } = input;

  await unique(async () => {
    if (!id) {
      const last = await Page.findOne({ kind: input.kind })
        .sort({ order: -1 })
        .lean();
      await Page.create({
        ...rest,
        slug: typed || slugify(input.title),
        order: (last?.order ?? 0) + 1,
      });
      return;
    }
    const row = isObjectId(id)
      ? await Page.findByIdAndUpdate(id, {
          ...rest,
          ...(typed && { slug: typed }),
        })
      : null;
    if (!row) throw missing("page");
  });
}

export async function deletePage(actor: Actor, id: string) {
  authorize(actor, "content.manage");
  await connectDb();
  if (isObjectId(id)) await Page.deleteOne({ _id: id });
}

export const postInput = z.object({
  title: z.string().trim().min(5, "Give it a title.").max(120),
  slug,
  excerpt: z
    .string()
    .trim()
    .min(20, "Sum it up in a sentence or two.")
    .max(240),
  body: z.string().trim().min(50, "Write a little more.").max(40_000),
  published: z.boolean(),
});

type PostRow = PostFields & { _id: unknown };

// A post in a list: everything but the body.
function toPostCard(row: PostRow) {
  return {
    id: String(row._id),
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    published: row.published,
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };
}

function toPostDto(row: PostRow) {
  return {
    id: String(row._id),
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    body: row.body,
    published: row.published,
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };
}

/** Published posts, newest first, without their bodies. */
export async function listPublishedPosts() {
  await connectDb();
  const rows = await Post.find({ published: true })
    .sort({ publishedAt: -1 })
    .lean();
  return rows.map(toPostCard);
}

export async function getPublishedPost(postSlug: string) {
  await connectDb();
  const row = await Post.findOne({ slug: postSlug, published: true }).lean();
  if (!row) throw missing("post");
  return toPostDto(row);
}

export async function listPosts(actor: Actor) {
  authorize(actor, "content.manage");
  await connectDb();
  return (await Post.find().sort({ updatedAt: -1 }).lean()).map(toPostCard);
}

export async function getPost(actor: Actor, id: string) {
  authorize(actor, "content.manage");
  await connectDb();
  const row = isObjectId(id) ? await Post.findById(id).lean() : null;
  if (!row) throw missing("post");
  return toPostDto(row);
}

export async function savePost(
  actor: Actor,
  id: string | null,
  input: z.infer<typeof postInput>,
) {
  authorize(actor, "content.manage");
  await connectDb();

  await unique(async () => {
    const row = id
      ? isObjectId(id)
        ? await Post.findById(id)
        : null
      : new Post();
    if (!row) throw missing("post");
    // As with pages, an address once given stays unless it is retyped.
    row.set({
      ...input,
      slug: input.slug || row.slug || slugify(input.title),
    });
    // The date it went out stays, even if it is unpublished and back.
    if (input.published) row.publishedAt ??= new Date();
    await row.save();
  });
}

export async function deletePost(actor: Actor, id: string) {
  authorize(actor, "content.manage");
  await connectDb();
  if (isObjectId(id)) await Post.deleteOne({ _id: id });
}

export const announcementInput = z.object({
  title: z.string().trim().min(3, "Give it a title.").max(60),
  body: z
    .string()
    .trim()
    .min(5, "Say something.")
    .max(200, "Use 200 characters or fewer."),
  // Empty for every active customer.
  email: z.union([
    z.email("Enter an email address, or leave it empty."),
    z.literal(""),
  ]),
});

/**
 * Puts a notification in front of customers: in the app's notification
 * centre, and as a system notification for anyone connected right now.
 */
export async function sendAnnouncement(
  actor: Actor,
  input: z.infer<typeof announcementInput>,
) {
  authorize(actor, "content.manage");
  await connectDb();

  const audience = await User.find(
    input.email
      ? { email: input.email.toLowerCase(), status: "active" }
      : { status: "active" },
  ).lean();
  if (audience.length === 0) {
    throw input.email
      ? new AppError("validation", "No active customer has that email.", {
          email: "No active customer has that email.",
        })
      : new AppError("conflict", "There is no one to send it to yet.");
  }

  await Notification.insertMany(
    audience.map((user) => ({
      userId: user._id,
      kind: "announcement",
      title: input.title,
      body: input.body,
    })),
  );
  await record(actor, {
    action: "announcement.sent",
    // An announcement has no record of its own; the id keeps the log's shape.
    target: {
      kind: "announcement",
      id: new Types.ObjectId(),
      label: input.title,
    },
    note: input.email
      ? `To ${input.email}`
      : `To all ${audience.length} customers`,
  });
  return audience.length;
}
