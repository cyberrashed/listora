import { AppError } from "@/server/errors";
import { route } from "@/server/http";
import { coordinates, nearestCity } from "@/server/places/places";

export const GET = route(async (request) => {
  const params = new URL(request.url).searchParams;
  const point = coordinates.safeParse({
    lat: params.get("lat") ?? "",
    lng: params.get("lng") ?? "",
  });
  if (!point.success) {
    throw new AppError("validation", "Pass a latitude and a longitude.");
  }

  const place = await nearestCity(point.data);
  if (!place) throw new AppError("not_found", "No city is near that point.");
  return Response.json(place);
});
