import type { ListingStatus } from "@/server/listings/lifecycle";
import { Pill } from "@/ui/pill";

export const statusLabels: Record<ListingStatus, string> = {
  in_review: "Waiting for review",
  active: "Live",
  rejected: "Rejected",
  sold: "Sold",
  expired: "Expired",
};

const tones = {
  in_review: "warning",
  active: "positive",
  rejected: "negative",
  sold: "neutral",
  expired: "neutral",
} as const;

export function StatusPill({ status }: { status: ListingStatus }) {
  return <Pill tone={tones[status]}>{statusLabels[status]}</Pill>;
}
