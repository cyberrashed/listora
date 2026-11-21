import { requireUser, route } from "@/server/http";
import { featureListing } from "@/server/listings/listings";

type Context = RouteContext<"/api/v1/listings/[id]/feature">;

export const POST = route(async (request, { params }: Context) => {
  const seller = await requireUser(request);
  return Response.json(await featureListing(seller, (await params).id));
});
