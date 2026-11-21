import "server-only";
import type { Types } from "mongoose";
import { connectDb, isObjectId } from "../db";
import { AppError } from "../errors";
import { User, type UserDoc } from "../users/user.model";
import { Block, Follow } from "./social.model";

async function findPerson(id: string) {
  const person = isObjectId(id) ? await User.findById(id).lean() : null;
  if (!person) throw new AppError("not_found", "That person isn't on Listora.");
  return person;
}

function notYourself(user: UserDoc, id: string) {
  if (user.id === id) {
    throw new AppError("validation", "That's you.");
  }
}

type Person = Awaited<ReturnType<typeof findPerson>>;

function toPersonDto(person: Person) {
  return {
    id: String(person._id),
    name: person.name,
    verified: person.verified,
    rating: { average: person.ratingAverage, count: person.ratingCount },
  };
}

export async function follow(user: UserDoc, sellerId: string) {
  await connectDb();
  notYourself(user, sellerId);
  await findPerson(sellerId);
  await Follow.updateOne(
    { followerId: user._id, sellerId },
    { $setOnInsert: { followerId: user._id, sellerId } },
    { upsert: true },
  );
}

export async function unfollow(user: UserDoc, sellerId: string) {
  await connectDb();
  await Follow.deleteOne({ followerId: user._id, sellerId });
}

/** The sellers someone follows, latest first. */
export async function listFollowing(user: UserDoc) {
  await connectDb();
  const rows = await Follow.find({ followerId: user._id })
    .sort({ createdAt: -1 })
    .lean();
  return people(rows.map((row) => row.sellerId));
}

export async function block(user: UserDoc, personId: string) {
  await connectDb();
  notYourself(user, personId);
  await findPerson(personId);
  await Block.updateOne(
    { blockerId: user._id, blockedId: personId },
    { $setOnInsert: { blockerId: user._id, blockedId: personId } },
    { upsert: true },
  );
}

export async function unblock(user: UserDoc, personId: string) {
  await connectDb();
  await Block.deleteOne({ blockerId: user._id, blockedId: personId });
}

export async function listBlocked(user: UserDoc) {
  await connectDb();
  const rows = await Block.find({ blockerId: user._id })
    .sort({ createdAt: -1 })
    .lean();
  return people(rows.map((row) => row.blockedId));
}

/** Whether either of two people has blocked the other. */
export async function blockedBetween(
  a: Types.ObjectId | string,
  b: Types.ObjectId | string,
) {
  return Boolean(
    await Block.exists({
      $or: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    }),
  );
}

// People in the order of `ids`, skipping anyone who has since left.
async function people(ids: Types.ObjectId[]) {
  const rows = await User.find({ _id: { $in: ids } }).lean();
  const byId = new Map(rows.map((row) => [String(row._id), row]));
  return ids.flatMap((id) => {
    const person = byId.get(String(id));
    return person ? [toPersonDto(person)] : [];
  });
}
