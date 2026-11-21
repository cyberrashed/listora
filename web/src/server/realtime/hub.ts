import "server-only";
import type { mongo } from "mongoose";
import { toConversationDtos, toMessageDto } from "../chat/chat";
import type { ConversationFields, MessageFields } from "../chat/chat.model";
import { connectDb } from "../db";
import type { NotificationFields } from "../notifications/notification.model";
import { toNotificationDto } from "../notifications/notifications";

export type AppEvent =
  | { type: "message"; data: ReturnType<typeof toMessageDto> }
  | {
      type: "conversation";
      data: Awaited<ReturnType<typeof toConversationDtos>>[number];
    }
  | { type: "notification"; data: ReturnType<typeof toNotificationDto> };

type Send = (event: AppEvent) => void;

type Hub = {
  listeners: Map<string, Set<Send>>;
  stream?: Promise<mongo.ChangeStream>;
};

// One change stream per process feeds every connected person. It lives on
// globalThis so hot reload in dev doesn't open a second one.
const global = globalThis as typeof globalThis & { listoraHub?: Hub };
const hub: Hub = (global.listoraHub ??= { listeners: new Map() });

const watched = ["messages", "conversations", "notifications"];

function open() {
  hub.stream ??= connectDb().then(async ({ connection }) => {
    const stream = connection.db!.watch(
      [
        {
          $match: {
            "ns.coll": { $in: watched },
            operationType: { $in: ["insert", "update", "replace"] },
          },
        },
      ],
      { fullDocument: "updateLookup" },
    );
    stream.on("change", (change) => {
      route(change).catch((error: unknown) => console.error(error));
    });
    stream.on("error", (error) => {
      console.error("Change stream closed", error);
      hub.stream = undefined;
      // Pick up again for whoever is still connected.
      if (hub.listeners.size > 0) setTimeout(open, 1000);
    });
    // The server starts watching only when it answers the first request,
    // which carries the first resume token. Changes before that are missed.
    await new Promise((resolve) => stream.once("resumeTokenChanged", resolve));
    return stream;
  });
  hub.stream.catch(() => (hub.stream = undefined));
}

function close() {
  const stream = hub.stream;
  hub.stream = undefined;
  void stream?.then((watching) => watching.close()).catch(() => {});
}

/**
 * Calls `send` with every event for this person until the returned function
 * is called. The change stream opens with the first listener and closes
 * after the last.
 */
export function subscribe(userId: string, send: Send) {
  const own = hub.listeners.get(userId) ?? new Set();
  own.add(send);
  hub.listeners.set(userId, own);
  open();

  let done = false;
  return () => {
    if (done) return;
    done = true;
    own.delete(send);
    if (own.size === 0) hub.listeners.delete(userId);
    if (hub.listeners.size === 0) close();
  };
}

/** Resolves once the stream is watching, so nothing written after is missed. */
export async function ready() {
  await hub.stream;
}

function deliver(userId: string, event: AppEvent) {
  for (const send of hub.listeners.get(userId) ?? []) send(event);
}

const listening = (...ids: { toString(): string }[]) =>
  ids.map(String).filter((id) => hub.listeners.has(id));

async function route(change: mongo.ChangeStreamDocument) {
  if (!("fullDocument" in change) || !change.fullDocument) return;
  if (!("ns" in change)) return;

  switch (change.ns.coll) {
    case "messages": {
      // A read receipt shows up through the conversation's unread count.
      if (change.operationType !== "insert") return;
      const message = change.fullDocument as MessageFields & { _id: unknown };
      const data = toMessageDto(message);
      for (const id of listening(message.senderId, message.recipientId)) {
        deliver(id, { type: "message", data });
      }
      return;
    }
    case "conversations": {
      const row = change.fullDocument as ConversationFields & { _id: unknown };
      for (const id of listening(row.buyerId, row.sellerId)) {
        const viewer = id === String(row.buyerId) ? row.buyerId : row.sellerId;
        const [data] = await toConversationDtos([row], viewer);
        deliver(id, { type: "conversation", data });
      }
      return;
    }
    case "notifications": {
      const notification = change.fullDocument as NotificationFields & {
        _id: unknown;
      };
      const data = toNotificationDto(notification);
      for (const id of listening(notification.userId)) {
        deliver(id, { type: "notification", data });
      }
      return;
    }
  }
}
