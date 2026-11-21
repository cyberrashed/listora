import "server-only";
import mongoose, { type InferSchemaType, type Model, Schema } from "mongoose";

// Where a banner on the app's home screen goes when tapped.
export const bannerLinks = ["none", "category", "search", "post"] as const;

const bannerSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, default: "" },
    link: { type: String, enum: bannerLinks, default: "none", required: true },
    // The category id, or the words to search for.
    target: String,
    active: { type: Boolean, default: true, required: true },
    order: { type: Number, default: 0, required: true },
  },
  { timestamps: true },
);

export type BannerFields = InferSchemaType<typeof bannerSchema>;
export const Banner: Model<BannerFields> =
  mongoose.models.Banner ?? mongoose.model("Banner", bannerSchema);

// Help: questions with short answers, and longer pages like the terms.
const pageSchema = new Schema(
  {
    kind: { type: String, enum: ["faq", "page"], required: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    // Plain text; a blank line starts a new paragraph.
    body: { type: String, required: true },
    published: { type: Boolean, default: true, required: true },
    order: { type: Number, default: 0, required: true },
  },
  { timestamps: true },
);

export type PageFields = InferSchemaType<typeof pageSchema>;
export const Page: Model<PageFields> =
  mongoose.models.Page ?? mongoose.model("Page", pageSchema);

const postSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    excerpt: { type: String, required: true },
    body: { type: String, required: true },
    published: { type: Boolean, default: false, required: true },
    // Set the first time it is published.
    publishedAt: Date,
  },
  { timestamps: true },
);

postSchema.index({ published: 1, publishedAt: -1 });

export type PostFields = InferSchemaType<typeof postSchema>;
export const Post: Model<PostFields> =
  mongoose.models.Post ?? mongoose.model("Post", postSchema);
