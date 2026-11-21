import { addFavorite, removeFavorite } from "@/server/favorites/favorites";
import { requireUser, route } from "@/server/http";

type Context = RouteContext<"/api/v1/me/favorites/[listingId]">;

export const PUT = route(async (request, { params }: Context) => {
  await addFavorite(await requireUser(request), (await params).listingId);
  return new Response(null, { status: 204 });
});

export const DELETE = route(async (request, { params }: Context) => {
  await removeFavorite(await requireUser(request), (await params).listingId);
  return new Response(null, { status: 204 });
});
