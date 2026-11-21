import { getPublishedPost } from "@/server/content/content";
import { route } from "@/server/http";

type Context = RouteContext<"/api/v1/posts/[slug]">;

export const GET = route(async (_request, { params }: Context) => {
  return Response.json(await getPublishedPost((await params).slug));
});
