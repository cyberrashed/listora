import { AppError } from "../errors";

export const listingStatuses = [
  "in_review",
  "active",
  "rejected",
  "sold",
  "expired",
] as const;

export type ListingStatus = (typeof listingStatuses)[number];

export type Rejection = { kind: "soft" | "permanent"; reason: string };

// Every way a listing can change status, and the statuses it can happen
// from. Nothing else in the code base assigns a status.
//
//   approve    staff accept a listing waiting for review
//   reject     staff turn one down, or take a live one off the market
//   revise     the seller edits it, which sends it back for review
//   markSold   the seller closes a live listing
//   expire     its time on the market runs out
//   renew      the seller puts an expired listing back up
const transitions = {
  approve: { from: ["in_review"], to: "active" },
  reject: { from: ["in_review", "active"], to: "rejected" },
  revise: { from: ["in_review", "active", "rejected"], to: "in_review" },
  markSold: { from: ["active"], to: "sold" },
  expire: { from: ["active"], to: "expired" },
  renew: { from: ["expired"], to: "active" },
} as const satisfies Record<
  string,
  { from: readonly ListingStatus[]; to: ListingStatus }
>;

export type ListingEvent = keyof typeof transitions;

const refusals: Record<ListingEvent, string> = {
  approve: "Only a listing waiting for review can be approved.",
  reject: "This listing is no longer on the market.",
  revise: "This listing can't be edited any more.",
  markSold: "Only a live listing can be marked as sold.",
  expire: "Only a live listing can expire.",
  renew: "Only a listing that has ended can be renewed.",
};

/**
 * The statuses `event` can happen from and the one it leads to, for jobs
 * that move many listings at once.
 */
export function transition(event: ListingEvent) {
  const { from, to } = transitions[event];
  return { from: [...from], to };
}

/**
 * The status `event` leads to, or a conflict when it isn't allowed from the
 * listing's current state.
 */
export function nextStatus(
  listing: { status: ListingStatus; rejection?: Rejection | null },
  event: ListingEvent,
): ListingStatus {
  const { from, to } = transitions[event];
  const allowed = (from as readonly ListingStatus[]).includes(listing.status);

  // A permanent rejection is final: the seller can't edit their way back in.
  const final =
    event === "revise" &&
    listing.status === "rejected" &&
    listing.rejection?.kind === "permanent";

  if (!allowed || final) throw new AppError("conflict", refusals[event]);
  return to;
}
