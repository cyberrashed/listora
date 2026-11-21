import "server-only";
import { z } from "zod";
import { record } from "../activity/activity";
import { verifyPassword } from "../auth/password";
import { personName } from "../auth/schemas";
import { Session } from "../auth/session.model";
import { Conversation, Message } from "../chat/chat.model";
import { connectDb, isObjectId } from "../db";
import { AppError } from "../errors";
import { Favorite } from "../favorites/favorite.model";
import { Listing } from "../listings/listing.model";
import { Photo } from "../media/photo.model";
import { deletePhotos } from "../media/photos";
import { Notification } from "../notifications/notification.model";
import { Report } from "../reports/report.model";
import { Review } from "../reviews/review.model";
import { refreshRating } from "../reviews/reviews";
import { Block, Follow } from "../social/social.model";
import { type Actor, authorize } from "../staff/authorize";
import { Verification } from "../verification/verification.model";
import { toUserDto, User, type UserDoc } from "./user.model";

export const profileUpdate = z.object({
  name: personName,
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number.")
    .nullable(),
});

export const accountDeletion = z.object({
  password: z.string().min(1, "Enter your password."),
});

export async function updateProfile(
  user: UserDoc,
  input: z.infer<typeof profileUpdate>,
) {
  user.name = input.name;
  user.phone = input.phone ?? undefined;
  await user.save();
  return toUserDto(user);
}

export async function deleteAccount(user: UserDoc, password: string) {
  if (!(await verifyPassword(password, user.passwordHash))) {
    throw new AppError("validation", "That password is wrong.", {
      password: "That password is wrong.",
    });
  }
  const conversations = await Conversation.find({
    $or: [{ buyerId: user._id }, { sellerId: user._id }],
  }).distinct("_id");
  // Their photos, posted or not, leave the bucket too.
  await deletePhotos(await Photo.find({ ownerId: user._id }).distinct("_id"));
  await Promise.all([
    Session.deleteMany({ userId: user._id }),
    Conversation.deleteMany({ _id: { $in: conversations } }),
    Message.deleteMany({ conversationId: { $in: conversations } }),
    Notification.deleteMany({ userId: user._id }),
    Follow.deleteMany({
      $or: [{ followerId: user._id }, { sellerId: user._id }],
    }),
    Block.deleteMany({
      $or: [{ blockerId: user._id }, { blockedId: user._id }],
    }),
    Verification.deleteMany({ userId: user._id }),
    Report.deleteMany({ reporterId: user._id, status: "open" }),
    Listing.deleteMany({ sellerId: user._id }),
    Favorite.deleteMany({ userId: user._id }),
  ]);
  // Their reviews of others go too, and those sellers' ratings follow.
  const reviewed = await Review.find({ reviewerId: user._id }).distinct(
    "sellerId",
  );
  await Review.deleteMany({
    $or: [{ reviewerId: user._id }, { sellerId: user._id }],
  });
  await Promise.all(reviewed.map((sellerId) => refreshRating(sellerId)));
  await user.deleteOne();
}

const PAGE_SIZE = 25;

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listCustomers(
  actor: Actor,
  { query = "", page = 1 }: { query?: string; page?: number },
) {
  authorize(actor, "customers.view");
  await connectDb();

  const term = query.trim();
  const filter = term
    ? {
        $or: [
          { name: { $regex: escapeRegex(term), $options: "i" } },
          { email: { $regex: escapeRegex(term), $options: "i" } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE),
    User.countDocuments(filter),
  ]);

  return { total, page, pageSize: PAGE_SIZE, items: users.map(toUserDto) };
}

export async function setCustomerStatus(
  actor: Actor,
  userId: string,
  status: "active" | "suspended",
) {
  authorize(actor, "customers.manage");
  await connectDb();

  const user = isObjectId(userId) ? await User.findById(userId) : null;
  if (!user) throw new AppError("not_found", "That customer no longer exists.");

  if (user.status === status) return;
  user.status = status;
  await user.save();
  await Listing.updateMany(
    { sellerId: user._id },
    { sellerActive: status === "active" },
  );
  await record(actor, {
    action:
      status === "suspended" ? "customer.suspended" : "customer.reinstated",
    target: { kind: "customer", id: user._id, label: user.name },
  });
  // A suspended customer is signed out everywhere at once.
  if (status === "suspended") await Session.deleteMany({ userId: user._id });
}
