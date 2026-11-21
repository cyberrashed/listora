import "server-only";
import { Category } from "../categories/category.model";
import { connectDb } from "../db";
import { Listing } from "../listings/listing.model";
import { Payment } from "../packages/package.model";
import { Report } from "../reports/report.model";
import { type Actor, can } from "../staff/authorize";
import { User } from "../users/user.model";
import { Verification } from "../verification/verification.model";

// Days are counted on US Central time, the middle of the market.
export const STATS_TIME_ZONE = "America/Chicago";
const DAYS = 30;
const DAY = 86_400_000;

const dayKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: STATS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The last [DAYS] days as "2026-11-17" keys, oldest first. */
function lastDays(now: Date) {
  return Array.from({ length: DAYS }, (_, index) =>
    dayKey.format(new Date(now.getTime() - (DAYS - 1 - index) * DAY)),
  );
}

function monthStart(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * The numbers the dashboard opens on. Each part is there only for staff
 * whose role covers it; the rest is null.
 */
export async function getOverview(actor: Actor, now = new Date()) {
  await connectDb();
  const allowed = {
    listings: can(actor, "listings.review"),
    customers: can(actor, "customers.view"),
    payments: can(actor, "payments.view"),
    reports: can(actor, "reports.handle"),
    verification: can(actor, "verification.review"),
  };
  const days = lastDays(now);

  const [
    waiting,
    oldest,
    live,
    posted,
    categories,
    newCustomers,
    revenue,
    openReports,
    pendingVerification,
  ] = await Promise.all([
    allowed.listings ? Listing.countDocuments({ status: "in_review" }) : null,
    allowed.listings
      ? Listing.find({ status: "in_review" })
          .sort({ submittedAt: 1 })
          .limit(5)
          .lean()
      : null,
    Listing.countDocuments({
      status: "active",
      expiresAt: { $gt: now },
      sellerActive: true,
    }),
    Listing.aggregate<{ _id: string; count: number }>([
      // A day on either side, then trimmed to the keys, so time zones can't
      // drop the first day.
      {
        $match: {
          createdAt: { $gte: new Date(now.getTime() - (DAYS + 1) * DAY) },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: STATS_TIME_ZONE,
            },
          },
          count: { $sum: 1 },
        },
      },
    ]),
    Listing.aggregate<{ _id: unknown; count: number }>([
      {
        $match: {
          status: "active",
          expiresAt: { $gt: now },
          sellerActive: true,
        },
      },
      { $group: { _id: { $first: "$categoryPath" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    allowed.customers
      ? User.countDocuments({
          createdAt: { $gte: new Date(now.getTime() - 7 * DAY) },
        })
      : null,
    allowed.payments
      ? Payment.aggregate<{ cents: number; count: number }>([
          { $match: { status: "paid", paidAt: { $gte: monthStart(now) } } },
          {
            $group: {
              _id: null,
              cents: { $sum: "$amountCents" },
              count: { $sum: 1 },
            },
          },
        ])
      : null,
    allowed.reports ? Report.countDocuments({ status: "open" }) : null,
    allowed.verification
      ? Verification.countDocuments({ status: "pending" })
      : null,
  ]);

  const names = new Map(
    (
      await Category.find({
        _id: { $in: categories.map((row) => row._id) },
      }).lean()
    ).map((row) => [String(row._id), row.name]),
  );
  const perDay = new Map(posted.map((row) => [row._id, row.count]));

  return {
    waiting,
    oldestWaiting: oldest?.[0]?.submittedAt.toISOString() ?? null,
    queue:
      oldest?.map((row) => ({
        id: String(row._id),
        title: row.title,
        submittedAt: row.submittedAt.toISOString(),
      })) ?? null,
    live,
    newCustomers,
    revenue: revenue
      ? { cents: revenue[0]?.cents ?? 0, count: revenue[0]?.count ?? 0 }
      : null,
    openReports,
    pendingVerification,
    postedPerDay: days.map((day) => ({ day, count: perDay.get(day) ?? 0 })),
    liveByCategory: categories.map((row) => ({
      name: names.get(String(row._id)) ?? "Removed category",
      count: row.count,
    })),
  };
}

export type Overview = Awaited<ReturnType<typeof getOverview>>;
