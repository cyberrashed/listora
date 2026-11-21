import { requireUser, route } from "@/server/http";
import { follow, unfollow } from "@/server/social/social";

type Context = RouteContext<"/api/v1/sellers/[id]/follow">;

export const PUT = route(async (request, { params }: Context) => {
  await follow(await requireUser(request), (await params).id);
  return new Response(null, { status: 204 });
});

export const DELETE = route(async (request, { params }: Context) => {
  await unfollow(await requireUser(request), (await params).id);
  return new Response(null, { status: 204 });
});
