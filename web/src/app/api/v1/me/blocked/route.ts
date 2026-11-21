import { requireUser, route } from "@/server/http";
import { listBlocked } from "@/server/social/social";

export const GET = route(async (request) => {
  return Response.json(await listBlocked(await requireUser(request)));
});
