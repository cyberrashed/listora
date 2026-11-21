import { parseBody, parseQuery, requireUser, route } from "@/server/http";
import { browseInput, browseListings } from "@/server/listings/browse";
import { createListing, listingInput } from "@/server/listings/listings";

export const GET = route(async (request) => {
  return Response.json(await browseListings(parseQuery(request, browseInput)));
});

export const POST = route(async (request) => {
  const seller = await requireUser(request);
  const input = await parseBody(request, listingInput);
  return Response.json(await createListing(seller, input), { status: 201 });
});
