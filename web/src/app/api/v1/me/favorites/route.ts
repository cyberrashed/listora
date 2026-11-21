import { listFavorites } from "@/server/favorites/favorites";
import { requireUser, route } from "@/server/http";

export const GET = route(async (request) => {
  return Response.json(await listFavorites(await requireUser(request)));
});
