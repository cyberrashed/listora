import { unreadMessages } from "@/server/chat/chat";
import { requireUser, route } from "@/server/http";
import { unreadNotifications } from "@/server/notifications/notifications";

/** The two badge counts the app shows, in one request. */
export const GET = route(async (request) => {
  const user = await requireUser(request);
  const [messages, notifications] = await Promise.all([
    unreadMessages(user),
    unreadNotifications(user),
  ]);
  return Response.json({ messages, notifications });
});
