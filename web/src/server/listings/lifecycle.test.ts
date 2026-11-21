import { describe, expect, it } from "vitest";
import {
  type ListingEvent,
  type ListingStatus,
  listingStatuses,
  nextStatus,
} from "./lifecycle";

// The whole table, written out: each event, where it may start, where it ends.
const allowed: Record<ListingEvent, [ListingStatus[], ListingStatus]> = {
  approve: [["in_review"], "active"],
  reject: [["in_review", "active"], "rejected"],
  revise: [["in_review", "active", "rejected"], "in_review"],
  markSold: [["active"], "sold"],
  expire: [["active"], "expired"],
  renew: [["expired"], "active"],
};

describe("listing lifecycle", () => {
  for (const [event, [from, to]] of Object.entries(allowed) as [
    ListingEvent,
    [ListingStatus[], ListingStatus],
  ][]) {
    for (const status of listingStatuses) {
      if (from.includes(status)) {
        it(`${event} takes a listing from ${status} to ${to}`, () => {
          expect(nextStatus({ status }, event)).toBe(to);
        });
      } else {
        it(`${event} is refused from ${status}`, () => {
          expect(() => nextStatus({ status }, event)).toThrow(
            expect.objectContaining({ code: "conflict" }),
          );
        });
      }
    }
  }

  it("lets a seller revise a soft rejection but not a permanent one", () => {
    const rejected = (kind: "soft" | "permanent") => ({
      status: "rejected" as const,
      rejection: { kind, reason: "Blurry photos" },
    });

    expect(nextStatus(rejected("soft"), "revise")).toBe("in_review");
    expect(() => nextStatus(rejected("permanent"), "revise")).toThrow(
      expect.objectContaining({ code: "conflict" }),
    );
  });

  it("keeps a sold listing closed, and an ended one closed but to renewing", () => {
    for (const event of Object.keys(allowed) as ListingEvent[]) {
      expect(() => nextStatus({ status: "sold" }, event)).toThrow();
      if (event !== "renew") {
        expect(() => nextStatus({ status: "expired" }, event)).toThrow();
      }
    }
  });
});
