import { requireUser, route } from "@/server/http";
import { markListingSold } from "@/server/listings/listings";

type Context = RouteContext<"/api/v1/listings/[id]/sold">;

export const POST = route(async (request, { params }: Context) => {
  const seller = await requireUser(request);
  return Response.json(await markListingSold(seller, (await params).id));
});
