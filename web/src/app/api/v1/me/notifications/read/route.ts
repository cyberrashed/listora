import { requireUser, route } from "@/server/http";
import { markNotificationsRead } from "@/server/notifications/notifications";

export const POST = route(async (request) => {
  await markNotificationsRead(await requireUser(request));
  return new Response(null, { status: 204 });
});
