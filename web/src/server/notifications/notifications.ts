import "server-only";
import type { Types } from "mongoose";
import { connectDb } from "../db";
import type { UserDoc } from "../users/user.model";
import { Notification, type NotificationFields } from "./notification.model";

type NewNotification = Pick<
  NotificationFields,
  "kind" | "title" | "body" | "link"
>;

// Stored, then sent to the app over the event stream when it is connected.
// Nothing is pushed through a third party.
export async function notify(
  userId: Types.ObjectId,
  notification: NewNotification,
) {
  await Notification.create({ userId, ...notification });
}

export function toNotificationDto(
  notification: NotificationFields & { _id: unknown },
) {
  return {
    id: String(notification._id),
    kind: notification.kind,
    title: notification.title,
    body: notification.body,
    link: notification.link ?? null,
    read: Boolean(notification.readAt),
    createdAt: notification.createdAt.toISOString(),
  };
}

const RECENT = 50;

export async function listNotifications(user: UserDoc) {
  await connectDb();

  const [items, unread] = await Promise.all([
    Notification.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(RECENT)
      .lean(),
    Notification.countDocuments({ userId: user._id, readAt: null }),
  ]);
  return { items: items.map(toNotificationDto), unread };
}

export async function unreadNotifications(user: UserDoc) {
  await connectDb();
  return Notification.countDocuments({ userId: user._id, readAt: null });
}

export async function markNotificationsRead(user: UserDoc) {
  await connectDb();
  await Notification.updateMany(
    { userId: user._id, readAt: null },
    { readAt: new Date() },
  );
}
