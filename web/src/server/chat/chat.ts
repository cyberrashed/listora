import "server-only";
import type { Types } from "mongoose";
import { z } from "zod";
import { connectDb, isObjectId } from "../db";
import { AppError } from "../errors";
import { getPublicListing } from "../listings/browse";
import { Listing } from "../listings/listing.model";
import { notify } from "../notifications/notifications";
import { blockedBetween } from "../social/social";
import { Block } from "../social/social.model";
import { User, type UserDoc } from "../users/user.model";
import {
  Conversation,
  type ConversationDoc,
  type ConversationFields,
  Message,
  type MessageFields,
  type messageKinds,
} from "./chat.model";

const RECENT_MESSAGES = 200;
const MAX_CENTS = 10_000_000_00;

export const messageInput = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Write a message.")
    .max(2000, "Keep it under 2,000 characters."),
});

export const offerInput = z.object({
  cents: z
    .number()
    .int()
    .positive("Enter an amount.")
    .max(MAX_CENTS, "That amount is too high."),
});

export const answerInput = z.object({ accept: z.boolean() });

const notFound = () =>
  new AppError("not_found", "That conversation no longer exists.");

type Role = "buyer" | "seller";

function roleOf(
  conversation: ConversationFields,
  userId: Types.ObjectId,
): Role | null {
  if (conversation.buyerId.equals(userId)) return "buyer";
  if (conversation.sellerId.equals(userId)) return "seller";
  return null;
}

async function findConversation(user: UserDoc, id: string) {
  const conversation = isObjectId(id) ? await Conversation.findById(id) : null;
  const role = conversation && roleOf(conversation, user._id);
  // Someone else's conversation is reported as missing.
  if (!conversation || !role) throw notFound();
  return { conversation, role };
}

type MessageRow = MessageFields & { _id: unknown };

export function toMessageDto(message: MessageRow) {
  return {
    id: String(message._id),
    conversationId: String(message.conversationId),
    senderId: String(message.senderId),
    kind: message.kind,
    text: message.text ?? null,
    cents: message.cents ?? null,
    createdAt: message.createdAt.toISOString(),
    read: Boolean(message.readAt),
  };
}

type ConversationRow = ConversationFields & { _id: unknown };

/**
 * Conversations as one person sees them. Listing and names are looked up
 * together, so a list costs three queries however long it is.
 */
export async function toConversationDtos(
  rows: ConversationRow[],
  viewerId: Types.ObjectId,
) {
  const [listings, people] = await Promise.all([
    Listing.find({ _id: { $in: rows.map((row) => row.listingId) } }).lean(),
    User.find({
      _id: { $in: rows.flatMap((row) => [row.buyerId, row.sellerId]) },
    }).lean(),
  ]);
  const listingById = new Map(listings.map((row) => [String(row._id), row]));
  const blocked = new Set(
    (
      await Block.find({
        blockerId: viewerId,
        blockedId: { $in: rows.flatMap((row) => [row.buyerId, row.sellerId]) },
      }).lean()
    ).map((row) => String(row.blockedId)),
  );
  const nameById = new Map(people.map((row) => [String(row._id), row.name]));

  return rows.map((row) => {
    const buying = row.buyerId.equals(viewerId);
    const otherId = buying ? row.sellerId : row.buyerId;
    const listing = listingById.get(String(row.listingId));
    const last = row.lastMessage;

    return {
      id: String(row._id),
      role: buying ? ("buying" as const) : ("selling" as const),
      // Null once the seller deletes the listing.
      listing: listing
        ? {
            id: String(listing._id),
            title: listing.title,
            status: listing.status,
            price: {
              mode: listing.price.mode,
              cents: listing.price.cents ?? null,
              maxCents: listing.price.maxCents ?? null,
            },
          }
        : null,
      other: {
        id: String(otherId),
        name: nameById.get(String(otherId)) ?? "Former member",
        blocked: blocked.has(String(otherId)),
      },
      lastMessage: last
        ? {
            kind: last.kind,
            text: last.text ?? null,
            cents: last.cents ?? null,
            at: last.at.toISOString(),
            mine: last.senderId.equals(viewerId),
          }
        : null,
      unread: buying ? row.buyerUnread : row.sellerUnread,
      offer: row.offer
        ? { cents: row.offer.cents, status: row.offer.status }
        : null,
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}

async function toDto(conversation: ConversationRow, viewer: UserDoc) {
  return (await toConversationDtos([conversation], viewer._id))[0];
}

// Records a message and moves the conversation along with it: the last
// message, the other side's unread count and, for offers, the offer.
async function post(
  conversation: ConversationDoc,
  role: Role,
  sender: UserDoc,
  fields: {
    kind: (typeof messageKinds)[number];
    text?: string;
    cents?: number;
  },
  offer?: ConversationFields["offer"],
) {
  const recipientId =
    role === "buyer" ? conversation.sellerId : conversation.buyerId;
  if (await blockedBetween(sender._id, recipientId)) {
    throw new AppError("forbidden", "You can't message this person.");
  }
  const message = await Message.create({
    conversationId: conversation._id,
    senderId: sender._id,
    recipientId,
    ...fields,
  });

  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        lastMessage: { senderId: sender._id, ...fields, at: message.createdAt },
        ...(offer && { offer }),
      },
      $inc: { [role === "buyer" ? "sellerUnread" : "buyerUnread"]: 1 },
    },
  );
  return toMessageDto(message);
}

/**
 * Opens the buyer's conversation about a listing, or returns the one they
 * already have. Nothing is sent until they write.
 */
export async function startConversation(buyer: UserDoc, listingId: string) {
  // Throws for anything that is not on the market.
  const listing = await getPublicListing(listingId);
  if (listing.seller.id === buyer.id) {
    throw new AppError("validation", "This is your own listing.");
  }
  if (await blockedBetween(buyer._id, listing.seller.id)) {
    throw new AppError("forbidden", "You can't message this person.");
  }

  const conversation = await Conversation.findOneAndUpdate(
    { listingId: listing.id, buyerId: buyer._id },
    { $setOnInsert: { sellerId: listing.seller.id } },
    { upsert: true, returnDocument: "after" },
  );
  return toDto(conversation, buyer);
}

export async function getConversation(user: UserDoc, id: string) {
  await connectDb();
  const { conversation } = await findConversation(user, id);
  return toDto(conversation, user);
}

/** Newest first, leaving out ones opened without a word sent. */
export async function listConversations(
  user: UserDoc,
  role: "buying" | "selling",
) {
  await connectDb();

  const rows = await Conversation.find({
    [role === "buying" ? "buyerId" : "sellerId"]: user._id,
    lastMessage: { $exists: true },
  })
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();
  return toConversationDtos(rows, user._id);
}

/** How many messages wait for the person across all their conversations. */
export async function unreadMessages(user: UserDoc) {
  await connectDb();
  const [counts] = await Conversation.aggregate<{ total: number }>([
    { $match: { $or: [{ buyerId: user._id }, { sellerId: user._id }] } },
    {
      $group: {
        _id: null,
        total: {
          $sum: {
            $cond: [
              { $eq: ["$buyerId", user._id] },
              "$buyerUnread",
              "$sellerUnread",
            ],
          },
        },
      },
    },
  ]);
  return counts?.total ?? 0;
}

/**
 * The latest messages, oldest first. With `after`, only what came since that
 * message, which is how the app catches up after a dropped connection.
 */
export async function listMessages(user: UserDoc, id: string, after?: string) {
  await connectDb();
  const { conversation } = await findConversation(user, id);

  const rows = await Message.find({
    conversationId: conversation._id,
    ...(after && isObjectId(after) && { _id: { $gt: after } }),
  })
    .sort({ _id: -1 })
    .limit(RECENT_MESSAGES)
    .lean();
  return rows.reverse().map(toMessageDto);
}

export async function sendMessage(
  user: UserDoc,
  id: string,
  input: z.infer<typeof messageInput>,
) {
  await connectDb();
  const { conversation, role } = await findConversation(user, id);
  return post(conversation, role, user, { kind: "text", text: input.text });
}

export async function makeOffer(
  buyer: UserDoc,
  id: string,
  input: z.infer<typeof offerInput>,
) {
  await connectDb();
  const { conversation, role } = await findConversation(buyer, id);
  if (role !== "buyer") {
    throw new AppError("forbidden", "Only the buyer can make an offer.");
  }

  const listing = await Listing.findById(conversation.listingId).lean();
  if (listing?.status !== "active") {
    throw new AppError("conflict", "This listing is no longer available.");
  }
  // One offer at a time, and none once the seller has said yes.
  if (conversation.offer?.status === "pending") {
    throw new AppError("conflict", "Wait for an answer to your last offer.");
  }
  if (conversation.offer?.status === "accepted") {
    throw new AppError("conflict", "Your offer was already accepted.");
  }

  const message = await post(
    conversation,
    role,
    buyer,
    { kind: "offer", cents: input.cents },
    { cents: input.cents, status: "pending" },
  );
  await notify(conversation.sellerId, {
    kind: "offer_received",
    title: "New offer",
    body: `${buyer.name} offered ${dollars(input.cents)} for “${listing.title}”.`,
    link: `/chats/${conversation.id as string}`,
  });
  return message;
}

export async function answerOffer(
  seller: UserDoc,
  id: string,
  { accept }: z.infer<typeof answerInput>,
) {
  await connectDb();
  const { conversation, role } = await findConversation(seller, id);
  if (role !== "seller") {
    throw new AppError("forbidden", "Only the seller can answer an offer.");
  }

  const offer = conversation.offer;
  if (offer?.status !== "pending") {
    throw new AppError("conflict", "There is no offer waiting for an answer.");
  }

  const message = await post(
    conversation,
    role,
    seller,
    { kind: accept ? "offer_accepted" : "offer_declined", cents: offer.cents },
    { cents: offer.cents, status: accept ? "accepted" : "declined" },
  );
  const listing = await Listing.findById(conversation.listingId).lean();
  await notify(conversation.buyerId, {
    kind: "offer_answered",
    title: accept ? "Offer accepted" : "Offer declined",
    body: `${seller.name} ${accept ? "accepted" : "declined"} your ${dollars(offer.cents)} offer${listing ? ` for “${listing.title}”` : ""}.`,
    link: `/chats/${conversation.id as string}`,
  });
  return message;
}

/** Marks what the person has received here as read. */
export async function markConversationRead(user: UserDoc, id: string) {
  await connectDb();
  const { conversation, role } = await findConversation(user, id);

  await Promise.all([
    Message.updateMany(
      { conversationId: conversation._id, recipientId: user._id, readAt: null },
      { readAt: new Date() },
    ),
    Conversation.updateOne(
      { _id: conversation._id },
      { [role === "buyer" ? "buyerUnread" : "sellerUnread"]: 0 },
      // Reading is not activity: the list keeps its order.
      { timestamps: false },
    ),
  ]);
}

function dollars(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
