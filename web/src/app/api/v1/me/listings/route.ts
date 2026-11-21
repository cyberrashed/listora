import { requireUser, route } from "@/server/http";
import { listOwnListings } from "@/server/listings/listings";

export const GET = route(async (request) => {
  const seller = await requireUser(request);
  return Response.json(await listOwnListings(seller));
});
