// Rebuilds the place data the seed loads, from three US Census Bureau files
// (public domain). Only needed when the Census publishes new data; the
// output is checked in under src/seed/data.
//
//   Gazetteer, places:  www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_place_national.zip
//   Gazetteer, ZCTAs:   www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_zcta_national.zip
//   Population:         www2.census.gov/programs-surveys/popest/datasets/2020-2023/cities/totals/sub-est2023.csv
//
//   node scripts/build-places.mjs <places.txt> <zctas.txt> <sub-est2023.csv>
import { readFileSync, writeFileSync } from "node:fs";

const [placesPath, zctasPath, populationPath] = process.argv.slice(2);
if (!populationPath) {
  throw new Error("Pass the places, ZCTA and population files, in that order.");
}

const MIN_POPULATION = 2500;
const MAX_MILES_TO_A_CITY = 100;

const states = new Set(
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(
    " ",
  ),
);

// The Census names consolidated governments in full. People don't.
const commonNames = new Map([
  ["Nashville-Davidson", "Nashville"],
  ["Louisville/Jefferson County", "Louisville"],
  ["Lexington-Fayette", "Lexington"],
  ["Athens-Clarke County", "Athens"],
  ["Augusta-Richmond County", "Augusta"],
  ["Macon-Bibb County", "Macon"],
  ["Urban Honolulu", "Honolulu"],
  ["Boise City", "Boise"],
]);

const kinds =
  / (city and borough|city|town|village|borough|municipality|CDP|urban county|unified government|consolidated government|metropolitan government|metro government)( \(balance\))?$/;

function commonName(censusName) {
  const name = censusName.replace(kinds, "");
  return commonNames.get(name) ?? name;
}

const rows = (path, separator, encoding = "utf8") =>
  readFileSync(path, encoding)
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((line) => line.split(separator).map((cell) => cell.trim()));

// Population by state and place code, for incorporated places (level 162).
const population = new Map();
for (const row of rows(populationPath, ",", "latin1")) {
  if (row[0] === "162") population.set(row[1] + row[3], Number(row.at(-1)));
}

const cities = rows(placesPath, "\t")
  .map(([state, geoid, , name, , , , , landSquareMiles, , lat, lng]) => ({
    name: commonName(name),
    state,
    lat: Number(lat),
    lng: Number(lng),
    // The city treated as a circle of the same land area.
    radius: Math.sqrt(Number(landSquareMiles) / Math.PI),
    population: population.get(geoid) ?? 0,
  }))
  .filter((city) => states.has(city.state) && city.population >= MIN_POPULATION)
  .sort((a, b) => b.population - a.population);

const toRadians = Math.PI / 180;
function miles(a, b) {
  const x =
    (b.lng - a.lng) * toRadians * Math.cos(((a.lat + b.lat) / 2) * toRadians);
  const y = (b.lat - a.lat) * toRadians;
  return Math.hypot(x, y) * 3958.8;
}

// A ZIP is labelled with the city it falls in, or failing that the nearest
// one. Distance is measured to the city edge, not its centre: by centre
// alone, Midtown Manhattan is "nearest" to Hoboken. Cities are sorted largest
// first, so a ZIP inside two overlapping circles goes to the bigger city.
// ZIPs far from any listed city are territories and remote areas outside the
// fifty states, and are left out.
const zips = [];
for (const [zip, , , , , lat, lng] of rows(zctasPath, "\t")) {
  const point = { lat: Number(lat), lng: Number(lng) };
  let nearest = 0;
  let distance = Infinity;
  for (const [index, city] of cities.entries()) {
    const d = Math.max(0, miles(point, city) - city.radius);
    if (d < distance) [nearest, distance] = [index, d];
  }
  if (distance <= MAX_MILES_TO_A_CITY)
    zips.push([zip, point.lat, point.lng, nearest]);
}

const round = (value) => Math.round(value * 1e4) / 1e4;
const lines = (records) =>
  `[\n${records.map((r) => JSON.stringify(r)).join(",\n")}\n]\n`;

const out = new URL("../src/seed/data/", import.meta.url);
writeFileSync(
  new URL("us-cities.json", out),
  lines(
    cities.map((c) => [
      c.name,
      c.state,
      round(c.lat),
      round(c.lng),
      c.population,
      Math.round(c.radius * 10) / 10,
    ]),
  ),
);
writeFileSync(
  new URL("us-zips.json", out),
  lines(
    zips.map(([zip, lat, lng, city]) => [zip, round(lat), round(lng), city]),
  ),
);

console.log(`${cities.length} cities, ${zips.length} ZIP codes`);
