import { requireUser, route } from "@/server/http";
import { renewListing } from "@/server/listings/listings";

type Context = RouteContext<"/api/v1/listings/[id]/renew">;

export const POST = route(async (request, { params }: Context) => {
  const seller = await requireUser(request);
  return Response.json(await renewListing(seller, (await params).id));
});
