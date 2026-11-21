import "server-only";
import mongoose, {
  type HydratedDocument,
  type InferSchemaType,
  type Model,
  Schema,
} from "mongoose";

export const messageKinds = [
  "text",
  "offer",
  "offer_accepted",
  "offer_declined",
] as const;

// A buyer's offer is the price in cents; an answer repeats it.
const lastMessageSchema = new Schema(
  {
    senderId: { type: Schema.Types.ObjectId, required: true },
    kind: { type: String, enum: messageKinds, required: true },
    text: String,
    cents: Number,
    at: { type: Date, required: true },
  },
  { _id: false },
);

const offerSchema = new Schema(
  {
    cents: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      required: true,
    },
  },
  { _id: false },
);

// One per buyer and listing. The seller is copied in so a person's
// conversations are found with one indexed match on either side.
const conversationSchema = new Schema(
  {
    listingId: { type: Schema.Types.ObjectId, required: true },
    buyerId: { type: Schema.Types.ObjectId, required: true },
    sellerId: { type: Schema.Types.ObjectId, required: true },
    lastMessage: lastMessageSchema,
    buyerUnread: { type: Number, default: 0, required: true },
    sellerUnread: { type: Number, default: 0, required: true },
    // The latest offer and where it stands.
    offer: offerSchema,
  },
  { timestamps: true },
);

conversationSchema.index({ listingId: 1, buyerId: 1 }, { unique: true });
conversationSchema.index({ buyerId: 1, updatedAt: -1 });
conversationSchema.index({ sellerId: 1, updatedAt: -1 });

export type ConversationFields = InferSchemaType<typeof conversationSchema>;
export type ConversationDoc = HydratedDocument<ConversationFields>;
export const Conversation: Model<ConversationFields> =
  mongoose.models.Conversation ??
  mongoose.model("Conversation", conversationSchema);

// The recipient is stored so a change event can be routed without a lookup.
const messageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, required: true },
    senderId: { type: Schema.Types.ObjectId, required: true },
    recipientId: { type: Schema.Types.ObjectId, required: true },
    kind: { type: String, enum: messageKinds, required: true },
    text: String,
    cents: Number,
    readAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

messageSchema.index({ conversationId: 1, _id: 1 });

export type MessageFields = InferSchemaType<typeof messageSchema>;
export const Message: Model<MessageFields> =
  mongoose.models.Message ?? mongoose.model("Message", messageSchema);
