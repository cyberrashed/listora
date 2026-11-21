import { getPublishedPage } from "@/server/content/content";
import { route } from "@/server/http";

type Context = RouteContext<"/api/v1/pages/[slug]">;

export const GET = route(async (_request, { params }: Context) => {
  return Response.json(await getPublishedPage((await params).slug));
});
