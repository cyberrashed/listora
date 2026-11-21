import "server-only";
import { z } from "zod";
import { connectDb } from "../db";
import { Place, type PlaceFields } from "./place.model";

export const coordinates = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

const SUGGESTIONS = 8;

function toPlaceDto(place: PlaceFields & { _id: unknown }) {
  const [lng, lat] = place.point.coordinates;
  const cityLabel = `${place.city}, ${place.state}`;

  return {
    id: String(place._id),
    kind: place.kind,
    label: place.zip ? `${place.zip} · ${cityLabel}` : cityLabel,
    city: place.city,
    state: place.state,
    zip: place.zip ?? null,
    lat,
    lng,
  };
}

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Suggestions for what someone has typed so far: digits match ZIP codes,
 * anything else matches city names, biggest city first. "austin, tx" narrows
 * by state.
 */
export async function searchPlaces(query: string) {
  await connectDb();

  const typed = query.trim().toLowerCase();
  if (!typed) return [];

  if (/^\d+$/.test(typed)) {
    const zips = await Place.find({ kind: "zip", key: { $regex: `^${typed}` } })
      .sort({ key: 1 })
      .limit(SUGGESTIONS)
      .lean();
    return zips.map(toPlaceDto);
  }

  const [name, state] = typed.split(",").map((part) => part.trim());
  const cities = await Place.find({
    kind: "city",
    key: { $regex: `^${escapeRegex(name)}` },
    ...(state && {
      state: { $regex: `^${escapeRegex(state)}`, $options: "i" },
    }),
  })
    .sort({ population: -1 })
    .limit(SUGGESTIONS)
    .lean();
  return cities.map(toPlaceDto);
}

export const EARTH_RADIUS_MILES = 3958.8;

function milesBetween(a: [number, number], b: [number, number]) {
  const toRadians = Math.PI / 180;
  const [lngA, latA] = a.map((degrees) => degrees * toRadians);
  const [lngB, latB] = b.map((degrees) => degrees * toRadians);
  const h =
    Math.sin((latB - latA) / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin((lngB - lngA) / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

/**
 * The city a point is in, for "use my current location". The nearest city
 * centre is often the wrong answer: downtown Denver is closer to the centre
 * of Glendale, a small city inside it. So the closest few centres are
 * compared by distance to each city edge, and the larger city wins a tie.
 */
export async function nearestCity({ lat, lng }: z.infer<typeof coordinates>) {
  await connectDb();

  const here: [number, number] = [lng, lat];
  const candidates = await Place.find({
    kind: "city",
    point: { $near: { $geometry: { type: "Point", coordinates: here } } },
  })
    .limit(20)
    .lean();
  if (candidates.length === 0) return null;

  const milesToEdge = (place: (typeof candidates)[number]) =>
    Math.max(
      0,
      milesBetween(here, place.point.coordinates as [number, number]) -
        (place.radiusMiles ?? 0),
    );

  const [closest] = candidates.sort(
    (a, b) => milesToEdge(a) - milesToEdge(b) || b.population - a.population,
  );
  return toPlaceDto(closest);
}
