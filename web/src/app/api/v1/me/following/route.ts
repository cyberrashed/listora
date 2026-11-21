import { requireUser, route } from "@/server/http";
import { listFollowing } from "@/server/social/social";

export const GET = route(async (request) => {
  return Response.json(await listFollowing(await requireUser(request)));
});
