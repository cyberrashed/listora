import { requireUser, route } from "@/server/http";
import { listNotifications } from "@/server/notifications/notifications";

export const GET = route(async (request) => {
  return Response.json(await listNotifications(await requireUser(request)));
});
