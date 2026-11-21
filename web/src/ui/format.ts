const date = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });
const dateTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});
const count = new Intl.NumberFormat("en-US");

export const formatDate = (value: Date | string) =>
  date.format(new Date(value));
export const formatDateTime = (value: Date | string) =>
  dateTime.format(new Date(value));
export const formatCount = (value: number) => count.format(value);

export function plural(value: number, one: string, many = `${one}s`) {
  return `${formatCount(value)} ${value === 1 ? one : many}`;
}

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const dollarsAndCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

// Whole dollars read cleaner; cents show only when there are some.
export const formatMoney = (cents: number) =>
  (cents % 100 === 0 ? dollars : dollarsAndCents).format(cents / 100);

export function formatPrice(price: {
  mode: string;
  cents: number | null;
  maxCents: number | null;
}) {
  switch (price.mode) {
    case "free":
      return "Free";
    case "on_request":
      return "Price on request";
    case "range":
      return `${formatMoney(price.cents!)}–${formatMoney(price.maxCents!)}`;
    case "negotiable":
      return `${formatMoney(price.cents!)} or best offer`;
    default:
      return formatMoney(price.cents!);
  }
}

/** How long ago, in the largest unit that fits: "40 min", "5 h", "3 d". */
export function timeSince(value: Date | string) {
  const minutes = Math.max(
    1,
    Math.round((Date.now() - new Date(value).getTime()) / 60_000),
  );
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h`;
  return `${Math.round(minutes / (60 * 24))} d`;
}
