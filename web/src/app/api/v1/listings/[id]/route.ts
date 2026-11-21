import { parseBody, requireUser, route } from "@/server/http";
import { getPublicListing } from "@/server/listings/browse";
import {
  deleteListing,
  listingInput,
  reviseListing,
} from "@/server/listings/listings";

type Context = RouteContext<"/api/v1/listings/[id]">;

export const GET = route(async (_request, { params }: Context) => {
  return Response.json(await getPublicListing((await params).id));
});

export const PATCH = route(async (request, { params }: Context) => {
  const seller = await requireUser(request);
  const input = await parseBody(request, listingInput);
  return Response.json(await reviseListing(seller, (await params).id, input));
});

export const DELETE = route(async (request, { params }: Context) => {
  const seller = await requireUser(request);
  await deleteListing(seller, (await params).id);
  return new Response(null, { status: 204 });
});
