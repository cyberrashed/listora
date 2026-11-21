import Link from "next/link";
import { requireStaff } from "@/features/auth/current-staff";
import { ColumnChart } from "@/features/overview/column-chart";
import { dayLabel } from "@/features/overview/day-label";
import { getOverview } from "@/server/stats/stats";
import { formatCount, formatMoney, plural, timeSince } from "@/ui/format";
import { PageHeader } from "@/ui/page-header";

function Tile({
  label,
  value,
  note,
  href,
}: {
  label: string;
  value: string;
  note?: string;
  href?: string;
}) {
  const body = (
    <>
      <dt className="text-muted text-[13px]">{label}</dt>
      <dd className="text-kpi font-semibold tabular-nums">{value}</dd>
      {note && <dd className="text-small text-muted">{note}</dd>}
    </>
  );
  const frame = "border-line rounded-card block border px-4 py-3";
  return href ? (
    <Link href={href} className={`${frame} hover:bg-raised transition-colors`}>
      {body}
    </Link>
  ) : (
    <div className={frame}>{body}</div>
  );
}

export default async function OverviewPage() {
  const actor = await requireStaff();
  const overview = await getOverview(actor);
  const posted = overview.postedPerDay.reduce((sum, day) => sum + day.count, 0);
  const biggest = Math.max(
    ...overview.liveByCategory.map((row) => row.count),
    1,
  );

  return (
    <>
      <PageHeader
        title="Overview"
        description="Where the marketplace stands right now."
      />
      <dl className="mb-8 grid max-w-[1100px] grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
        {overview.waiting !== null && (
          <Tile
            label="Waiting for review"
            value={formatCount(overview.waiting)}
            note={
              overview.oldestWaiting
                ? `Oldest waiting ${timeSince(overview.oldestWaiting)}`
                : "The queue is clear"
            }
            href="/listings"
          />
        )}
        <Tile label="Live listings" value={formatCount(overview.live)} />
        {overview.newCustomers !== null && (
          <Tile
            label="New customers"
            value={formatCount(overview.newCustomers)}
            note="In the last 7 days"
            href="/customers"
          />
        )}
        {overview.revenue && (
          <Tile
            label="Sales this month"
            value={formatMoney(overview.revenue.cents)}
            note={plural(overview.revenue.count, "payment")}
            href="/payments"
          />
        )}
        {overview.openReports !== null && (
          <Tile
            label="Open reports"
            value={formatCount(overview.openReports)}
            note={
              overview.pendingVerification
                ? `${plural(overview.pendingVerification, "seller")} to verify`
                : undefined
            }
            href="/reports"
          />
        )}
      </dl>

      <div className="grid max-w-[1100px] gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="border-line rounded-card min-w-0 self-start border p-4">
          <h2 className="text-section font-medium">Listings posted per day</h2>
          <p className="text-small text-muted mb-4">
            The last 30 days · {plural(posted, "listing")} in all
          </p>
          <ColumnChart points={overview.postedPerDay} />
          <details className="mt-3">
            <summary className="text-small text-muted hover:text-ink cursor-pointer">
              Show the numbers
            </summary>
            <table className="data-table mt-2 max-w-[320px]">
              <thead>
                <tr>
                  <th>Day</th>
                  <th className="end">Posted</th>
                </tr>
              </thead>
              <tbody>
                {overview.postedPerDay.map((point) => (
                  <tr key={point.day}>
                    <td>{dayLabel(point.day)}</td>
                    <td className="end tabular-nums">{point.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </section>

        <div className="grid content-start gap-8">
          {overview.queue && (
            <section>
              <h2 className="text-section mb-1 font-medium">
                Waiting the longest
              </h2>
              {overview.queue.length === 0 ? (
                <p className="text-muted">Nothing is waiting for review.</p>
              ) : (
                <ul className="divide-rule divide-y">
                  {overview.queue.map((listing) => (
                    <li
                      key={listing.id}
                      className="flex items-baseline justify-between gap-4 py-2"
                    >
                      <Link
                        href={`/listings/${listing.id}`}
                        className="line-clamp-1 hover:underline"
                      >
                        {listing.title}
                      </Link>
                      <span className="text-muted whitespace-nowrap tabular-nums">
                        {timeSince(listing.submittedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          <section>
            <h2 className="text-section mb-2 font-medium">
              Live listings by category
            </h2>
            <ul className="grid gap-2.5">
              {overview.liveByCategory.slice(0, 7).map((row) => (
                <li
                  key={row.name}
                  className="grid grid-cols-[120px_minmax(0,1fr)_32px] items-center gap-3"
                >
                  <span className="truncate">{row.name}</span>
                  <span className="bg-rule h-2 rounded-full" aria-hidden="true">
                    <span
                      className="bg-chart block h-2 rounded-full"
                      style={{ width: `${(row.count / biggest) * 100}%` }}
                    />
                  </span>
                  <span className="text-right tabular-nums">{row.count}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
