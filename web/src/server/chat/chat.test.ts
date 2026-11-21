import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as events } from "@/app/api/v1/events/route";
import { Activity } from "../activity/activity.model";
import { hashPassword } from "../auth/password";
import { signAccessToken } from "../auth/tokens";
import { createCategory } from "../categories/categories";
import { connectDb } from "../db";
import {
  approveListing,
  createListing,
  markListingSold,
} from "../listings/listings";
import { Notification } from "../notifications/notification.model";
import { Place } from "../places/place.model";
import { type AppEvent, ready, subscribe } from "../realtime/hub";
import type { Actor } from "../staff/authorize";
import { withTestDatabase } from "../testing";
import { User, type UserDoc } from "../users/user.model";
import { deleteAccount } from "../users/users";
import {
  answerOffer,
  getConversation,
  listConversations,
  listMessages,
  makeOffer,
  markConversationRead,
  sendMessage,
  startConversation,
  unreadMessages,
} from "./chat";
import { Conversation, Message } from "./chat.model";
import { findConversations, readConversation } from "./oversight";

withTestDatabase();

// The change stream needs the collections to exist before it is useful.
beforeAll(async () => {
  await connectDb();
  await Promise.all([Conversation.init(), Message.init(), Notification.init()]);
});

const staff: Actor = {
  id: "000000000000000000000001",
  name: "Marcus Bell",
  email: "marcus@listora.test",
  role: "Moderator",
  owner: false,
  permissions: ["listings.review", "categories.manage"],
};

let dana: UserDoc;
let miguel: UserDoc;
let hannah: UserDoc;
let civic: string;

beforeEach(async () => {
  [dana, miguel, hannah] = await User.create([
    {
      name: "Dana Whitfield",
      email: "dana@mailbox.example",
      passwordHash: await hashPassword("a long enough password"),
    },
    {
      name: "Miguel Ortega",
      email: "miguel@mailbox.example",
      passwordHash: "x",
    },
    {
      name: "Hannah Brooks",
      email: "hannah@mailbox.example",
      passwordHash: "x",
    },
  ]);

  const vehicles = await createCategory(staff, {
    name: "Vehicles",
    parentId: null,
  });
  const cars = await createCategory(staff, {
    name: "Cars",
    parentId: vehicles,
  });
  const austin = await Place.create({
    kind: "city",
    key: "austin",
    city: "Austin",
    state: "TX",
    population: 979882,
    point: { type: "Point", coordinates: [-97.7431, 30.2672] },
  });

  ({ id: civic } = await createListing(dana, {
    title: "2015 Honda Civic LX",
    description: "One owner, clean title, new tires in March. Runs great.",
    categoryId: cars,
    price: { mode: "negotiable", cents: 890000 },
    attributes: {},
    placeId: austin.id as string,
    showPhone: false,
  }));
  await approveListing(staff, civic);
  await Notification.deleteMany();
});

describe("conversations", () => {
  it("are opened once per buyer and listing", async () => {
    const first = await startConversation(miguel, civic);
    const again = await startConversation(miguel, civic);

    expect(again.id).toBe(first.id);
    expect(first).toMatchObject({
      role: "buying",
      listing: { title: "2015 Honda Civic LX", status: "active" },
      other: { name: "Dana Whitfield" },
      lastMessage: null,
    });
  });

  it("can't be opened with yourself or about what isn't on the market", async () => {
    await expect(startConversation(dana, civic)).rejects.toMatchObject({
      code: "validation",
    });

    await markListingSold(dana, civic);
    await expect(startConversation(miguel, civic)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("show up for both sides once something is said", async () => {
    const { id } = await startConversation(miguel, civic);
    expect(await listConversations(dana, "selling")).toEqual([]);

    await sendMessage(miguel, id, { text: "Is it still available?" });
    await sendMessage(miguel, id, { text: "I could come by on Saturday." });

    expect(await listConversations(dana, "selling")).toMatchObject([
      {
        role: "selling",
        other: { name: "Miguel Ortega" },
        lastMessage: { text: "I could come by on Saturday.", mine: false },
        unread: 2,
      },
    ]);
    expect(await listConversations(miguel, "buying")).toMatchObject([
      { lastMessage: { mine: true }, unread: 0 },
    ]);
    expect(await unreadMessages(dana)).toBe(2);
  });

  it("are read up to date when opened", async () => {
    const { id } = await startConversation(miguel, civic);
    await sendMessage(miguel, id, { text: "Is it still available?" });

    await markConversationRead(dana, id);

    expect((await getConversation(dana, id)).unread).toBe(0);
    expect(await listMessages(miguel, id)).toMatchObject([{ read: true }]);
    expect(await unreadMessages(dana)).toBe(0);
  });

  it("hand back only what came after a given message", async () => {
    const { id } = await startConversation(miguel, civic);
    const first = await sendMessage(miguel, id, { text: "Hi" });
    await sendMessage(dana, id, { text: "Hello" });
    await sendMessage(miguel, id, { text: "Is the price firm?" });

    const missed = await listMessages(dana, id, first.id);

    expect(missed.map((message) => message.text)).toEqual([
      "Hello",
      "Is the price firm?",
    ]);
  });

  it("are missing to anyone who isn't in them", async () => {
    const { id } = await startConversation(miguel, civic);

    for (const attempt of [
      () => getConversation(hannah, id),
      () => listMessages(hannah, id),
      () => sendMessage(hannah, id, { text: "Hello?" }),
    ]) {
      await expect(attempt()).rejects.toMatchObject({ code: "not_found" });
    }
  });

  it("go when either person deletes their account", async () => {
    const { id } = await startConversation(miguel, civic);
    await sendMessage(miguel, id, { text: "Is it still available?" });

    await deleteAccount(dana, "a long enough password");

    expect(await Conversation.countDocuments()).toBe(0);
    expect(await Message.countDocuments()).toBe(0);
  });
});

describe("offers", () => {
  it("go from the buyer to the seller and back", async () => {
    const { id } = await startConversation(miguel, civic);

    await makeOffer(miguel, id, { cents: 820000 });
    expect(await getConversation(dana, id)).toMatchObject({
      offer: { cents: 820000, status: "pending" },
      lastMessage: { kind: "offer", cents: 820000 },
    });

    await answerOffer(dana, id, { accept: true });
    expect(await getConversation(miguel, id)).toMatchObject({
      offer: { status: "accepted" },
      lastMessage: { kind: "offer_accepted", cents: 820000, mine: false },
    });

    expect(
      await Notification.find().sort({ createdAt: 1 }).lean(),
    ).toMatchObject([
      {
        userId: dana._id,
        kind: "offer_received",
        body: "Miguel Ortega offered $8,200 for “2015 Honda Civic LX”.",
        link: `/chats/${id}`,
      },
      { userId: miguel._id, kind: "offer_answered", title: "Offer accepted" },
    ]);
  });

  it("are made by the buyer and answered once by the seller", async () => {
    const { id } = await startConversation(miguel, civic);

    await expect(makeOffer(dana, id, { cents: 100 })).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(answerOffer(dana, id, { accept: true })).rejects.toMatchObject(
      { code: "conflict" },
    );

    await makeOffer(miguel, id, { cents: 700000 });
    await expect(
      answerOffer(miguel, id, { accept: true }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      makeOffer(miguel, id, { cents: 750000 }),
    ).rejects.toMatchObject({ code: "conflict" });
    await answerOffer(dana, id, { accept: false });
    await expect(answerOffer(dana, id, { accept: true })).rejects.toMatchObject(
      { code: "conflict" },
    );

    // A declined offer can be raised; an accepted one is settled.
    await makeOffer(miguel, id, { cents: 800000 });
    await answerOffer(dana, id, { accept: true });
    await expect(
      makeOffer(miguel, id, { cents: 810000 }),
    ).rejects.toMatchObject({ code: "conflict" });
  });

  it("stop once the listing has sold", async () => {
    const { id } = await startConversation(miguel, civic);
    await markListingSold(dana, civic);

    await expect(
      makeOffer(miguel, id, { cents: 800000 }),
    ).rejects.toMatchObject({ code: "conflict" });
  });
});

describe("live events", () => {
  const stops: (() => void)[] = [];
  afterEach(() => stops.splice(0).forEach((stop) => stop()));

  // Collects what one person is sent, until `count` events have arrived.
  function listen(user: UserDoc) {
    const received: AppEvent[] = [];
    stops.push(subscribe(user.id as string, (event) => received.push(event)));
    return {
      received,
      async until(count: number) {
        for (let wait = 0; wait < 100 && received.length < count; wait++) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        return received;
      },
    };
  }

  it("bring a message to both sides, and the unread count to the other", async () => {
    const { id } = await startConversation(miguel, civic);
    const seller = listen(dana);
    const buyer = listen(miguel);
    const stranger = listen(hannah);
    await ready();

    await sendMessage(miguel, id, { text: "Is it still available?" });

    const toSeller = await seller.until(2);
    expect(toSeller).toContainEqual({
      type: "message",
      data: expect.objectContaining({ text: "Is it still available?" }),
    });
    expect(toSeller).toContainEqual({
      type: "conversation",
      data: expect.objectContaining({ id, role: "selling", unread: 1 }),
    });
    expect(await buyer.until(2)).toContainEqual({
      type: "conversation",
      data: expect.objectContaining({ id, role: "buying", unread: 0 }),
    });
    expect(stranger.received).toEqual([]);
  });

  it("bring a notification to the person it is for", async () => {
    const { id } = await startConversation(miguel, civic);
    const seller = listen(dana);
    await ready();

    await makeOffer(miguel, id, { cents: 820000 });

    expect(await seller.until(3)).toContainEqual({
      type: "notification",
      data: expect.objectContaining({ kind: "offer_received", read: false }),
    });
  });

  it("reach the app as server-sent events", async () => {
    const { id } = await startConversation(miguel, civic);
    const abort = new AbortController();
    const response = await events(
      new Request("http://localhost/api/v1/events", {
        headers: {
          authorization: `Bearer ${await signAccessToken(dana.id as string)}`,
        },
        signal: abort.signal,
      }),
      undefined as never,
    );
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let text = "";
    const read = async (until: string) => {
      while (!text.includes(until)) {
        const { value } = await reader.read();
        text += decoder.decode(value);
      }
    };

    expect(response.headers.get("content-type")).toContain("text/event-stream");
    await read("event: ready");
    await ready();
    await sendMessage(miguel, id, { text: "Is it still available?" });
    await read("Is it still available?");
    abort.abort();

    expect(text).toMatch(
      /event: message\ndata: \{.*"text":"Is it still available\?"/,
    );
  });
});

describe("moderator access", () => {
  const moderator = { ...staff, permissions: ["reports.handle" as const] };

  it("finds a customer's chats and logs each one read", async () => {
    const { id } = await startConversation(miguel, civic);
    await sendMessage(miguel, id, { text: "Is it still available?" });

    const found = await findConversations(moderator, "MIGUEL@mailbox.example");
    expect(found.items).toMatchObject([{ id, buyer: "Miguel Ortega" }]);

    const opened = await readConversation(moderator, id);
    expect(opened.messages).toMatchObject([{ text: "Is it still available?" }]);
    expect(await Activity.countDocuments({ action: "conversation.read" })).toBe(
      1,
    );
    await expect(
      findConversations(staff, "miguel@mailbox.example"),
    ).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});
