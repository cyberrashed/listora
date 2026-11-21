import { route } from "@/server/http";
import { searchPlaces } from "@/server/places/places";

export const GET = route(async (request) => {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  return Response.json(await searchPlaces(query));
});
