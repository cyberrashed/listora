import "server-only";
import { readFileSync } from "node:fs";
import { Place } from "./place.model";

type City = [
  name: string,
  state: string,
  lat: number,
  lng: number,
  population: number,
  radiusMiles: number,
];
type Zip = [zip: string, lat: number, lng: number, cityIndex: number];

const read = <T>(file: string): T =>
  JSON.parse(
    readFileSync(new URL(`../../seed/data/${file}`, import.meta.url), "utf8"),
  ) as T;

const point = (lat: number, lng: number) => ({
  type: "Point" as const,
  coordinates: [lng, lat],
});

/** Replaces the places collection with the checked-in Census data. */
export async function loadPlaces() {
  const cities = read<City[]>("us-cities.json");
  const zips = read<Zip[]>("us-zips.json");

  await Place.deleteMany();
  await Place.insertMany(
    cities.map(([city, state, lat, lng, population, radiusMiles]) => ({
      kind: "city",
      key: city.toLowerCase(),
      city,
      state,
      population,
      radiusMiles,
      point: point(lat, lng),
    })),
  );
  await Place.insertMany(
    zips.map(([zip, lat, lng, cityIndex]) => {
      const [city, state, , , population] = cities[cityIndex];
      return {
        kind: "zip",
        key: zip,
        city,
        state,
        zip,
        population,
        point: point(lat, lng),
      };
    }),
  );
  await Place.syncIndexes();

  return { cities: cities.length, zips: zips.length };
}
