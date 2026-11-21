import "server-only";
import { record } from "../activity/activity";
import { connectDb, isObjectId } from "../db";
import { AppError } from "../errors";
import { Listing } from "../listings/listing.model";
import { type Actor, authorize } from "../staff/authorize";
import { User } from "../users/user.model";
import { toMessageDto } from "./chat";
import { Conversation, Message } from "./chat.model";

// Staff read chats only to settle a report, and every read is logged.

/** A customer's conversations, found by their email, newest first. */
export async function findConversations(actor: Actor, email: string) {
  authorize(actor, "reports.handle");
  await connectDb();

  const customer = await User.findOne({
    email: email.trim().toLowerCase(),
  }).lean();
  if (!customer) return { customer: null, items: [] };

  const rows = await Conversation.find({
    $or: [{ buyerId: customer._id }, { sellerId: customer._id }],
    lastMessage: { $exists: true },
  })
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();
  const [people, listings] = await Promise.all([
    User.find({
      _id: { $in: rows.flatMap((row) => [row.buyerId, row.sellerId]) },
    }).lean(),
    Listing.find({ _id: { $in: rows.map((row) => row.listingId) } }).lean(),
  ]);
  const name = new Map(people.map((row) => [String(row._id), row.name]));
  const title = new Map(listings.map((row) => [String(row._id), row.title]));

  return {
    customer: {
      id: String(customer._id),
      name: customer.name,
      email: customer.email,
    },
    items: rows.map((row) => ({
      id: String(row._id),
      listingTitle: title.get(String(row.listingId)) ?? "Listing removed",
      buyer: name.get(String(row.buyerId)) ?? "Former member",
      seller: name.get(String(row.sellerId)) ?? "Former member",
      lastAt: row.lastMessage!.at.toISOString(),
    })),
  };
}

/** One conversation in full, for a moderator. Reading it is logged. */
export async function readConversation(actor: Actor, id: string) {
  authorize(actor, "reports.handle");
  await connectDb();

  const conversation = isObjectId(id)
    ? await Conversation.findById(id).lean()
    : null;
  if (!conversation) {
    throw new AppError("not_found", "That conversation no longer exists.");
  }
  const [buyer, seller, listing, messages] = await Promise.all([
    User.findById(conversation.buyerId).lean(),
    User.findById(conversation.sellerId).lean(),
    Listing.findById(conversation.listingId).lean(),
    Message.find({ conversationId: conversation._id })
      .sort({ _id: 1 })
      .limit(500)
      .lean(),
  ]);

  const label = `${buyer?.name ?? "Former member"} and ${seller?.name ?? "Former member"}`;
  await record(actor, {
    action: "conversation.read",
    target: { kind: "conversation", id: conversation._id, label },
    note: listing ? `About “${listing.title}”` : undefined,
  });

  return {
    id: String(conversation._id),
    listing: listing ? { id: String(listing._id), title: listing.title } : null,
    buyer: buyer
      ? { id: String(buyer._id), name: buyer.name, email: buyer.email }
      : null,
    seller: seller
      ? { id: String(seller._id), name: seller.name, email: seller.email }
      : null,
    messages: messages.map(toMessageDto),
  };
}
