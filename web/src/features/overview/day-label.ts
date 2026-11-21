const shortDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** "2026-11-17" as "Nov 17". The key is a calendar day already. */
export const dayLabel = (day: string) =>
  shortDate.format(new Date(`${day}T12:00:00Z`));
