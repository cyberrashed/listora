import { beforeEach, describe, expect, it } from "vitest";
import { withTestDatabase } from "../testing";
import { loadPlaces } from "./load";
import { nearestCity, searchPlaces } from "./places";

withTestDatabase();

// The collections are emptied before each test, so the real data is loaded
// again. It takes about a second.
beforeEach(async () => {
  await loadPlaces();
});

const labels = async (query: string) =>
  (await searchPlaces(query)).map((place) => place.label);

describe("searching places", () => {
  it("suggests cities by prefix, biggest first", async () => {
    const suggestions = await labels("aus");

    expect(suggestions[0]).toBe("Austin, TX");
    expect(suggestions).toContain("Austin, MN");
  });

  it("narrows by state after a comma", async () => {
    expect(await labels("springfield, mo")).toEqual(["Springfield, MO"]);
  });

  it("ignores case and surrounding spaces", async () => {
    expect((await labels("  SEATTLE "))[0]).toBe("Seattle, WA");
  });

  it("matches ZIP codes when the query is digits", async () => {
    expect(await labels("78704")).toEqual(["78704 · Austin, TX"]);
    expect(
      (await labels("787")).every((label) => label.startsWith("787")),
    ).toBe(true);
  });

  it("returns nothing for an empty or unknown query", async () => {
    expect(await labels("   ")).toEqual([]);
    expect(await labels("zzzzzz")).toEqual([]);
  });

  it("treats regex characters as plain text", async () => {
    expect(await labels(".*")).toEqual([]);
  });
});

describe("finding the nearest city", () => {
  it("returns the city a point sits in", async () => {
    // Zilker Park, Austin.
    const place = await nearestCity({ lat: 30.267, lng: -97.773 });

    expect(place?.label).toBe("Austin, TX");
  });

  it("prefers the big city over a small one enclosed by it", async () => {
    // Downtown Denver is nearer to the centre of Glendale than of Denver.
    const place = await nearestCity({ lat: 39.7392, lng: -104.9903 });

    expect(place?.label).toBe("Denver, CO");
  });
});
