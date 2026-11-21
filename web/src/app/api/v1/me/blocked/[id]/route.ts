import { requireUser, route } from "@/server/http";
import { block, unblock } from "@/server/social/social";

type Context = RouteContext<"/api/v1/me/blocked/[id]">;

export const PUT = route(async (request, { params }: Context) => {
  await block(await requireUser(request), (await params).id);
  return new Response(null, { status: 204 });
});

export const DELETE = route(async (request, { params }: Context) => {
  await unblock(await requireUser(request), (await params).id);
  return new Response(null, { status: 204 });
});
