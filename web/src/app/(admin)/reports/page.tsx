import Link from "next/link";
import { requireStaff } from "@/features/auth/current-staff";
import { listReports } from "@/server/reports/reports";
import { can } from "@/server/staff/authorize";
import { EmptyState } from "@/ui/empty-state";
import { formatCount, plural, timeSince } from "@/ui/format";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";
import { Pagination } from "@/ui/pagination";

const statuses = [
  { name: "open", label: "Open" },
  { name: "resolved", label: "Acted on" },
  { name: "dismissed", label: "Dismissed" },
] as const;

const kinds = { listing: "Listing", review: "Review", user: "Account" };

export default async function ReportsPage({
  searchParams,
}: PageProps<"/reports">) {
  const actor = await requireStaff();
  if (!can(actor, "reports.handle")) return <NoAccess title="Reports" />;

  const params = await searchParams;
  const status =
    statuses.find((item) => item.name === params.status)?.name ?? "open";
  const page = Math.max(1, Number(params.page) || 1);
  const { items, total, pageSize, counts } = await listReports(actor, {
    status,
    page,
  });
  const open = status === "open";

  return (
    <>
      <PageHeader
        title="Reports"
        description={
          counts.open === 0
            ? "Nothing is waiting. Customers report listings, reviews and accounts from the app."
            : `${plural(counts.open, "report")} ${counts.open === 1 ? "needs" : "need"} a decision.`
        }
      />
      <nav
        aria-label="Status"
        className="mb-6 grid max-w-[600px] grid-cols-3 gap-2"
      >
        {statuses.map((item) => (
          <Link
            key={item.name}
            href={`/reports?status=${item.name}`}
            aria-current={item.name === status ? "true" : undefined}
            className="border-line hover:bg-raised aria-[current=true]:border-accent aria-[current=true]:bg-accent/5 rounded-card border-[1.5px] px-3 py-2.5 transition-colors"
          >
            <span className="text-muted block text-[13px]">{item.label}</span>
            <span className="text-section block font-semibold tabular-nums">
              {formatCount(counts[item.name])}
            </span>
          </Link>
        ))}
      </nav>
      {items.length === 0 ? (
        <EmptyState>
          {open ? "The queue is clear." : "Nothing here yet."}
        </EmptyState>
      ) : (
        <table className="data-table max-w-[1000px]">
          <thead>
            <tr>
              <th>Reported</th>
              <th>Reason</th>
              <th>By</th>
              <th className="end">{open ? "Waiting" : "Handled by"}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((report) => (
              <tr key={report.id}>
                <td className="wide">
                  <Link
                    href={`/reports/${report.id}`}
                    className="line-clamp-2 font-medium hover:underline"
                  >
                    {report.target.label}
                  </Link>
                  <span className="text-small text-muted block">
                    {kinds[report.target.kind]}
                  </span>
                </td>
                <td>
                  {report.reasonLabel}
                  {report.note && (
                    <span className="text-small text-muted line-clamp-1 block max-w-64">
                      “{report.note}”
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap">{report.reporterName}</td>
                <td className="end whitespace-nowrap">
                  {open
                    ? timeSince(report.filedAt)
                    : report.resolution?.staffName}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Pagination
        page={page}
        pageSize={pageSize}
        shown={items.length}
        total={total}
        href={(target) => `/reports?status=${status}&page=${target}`}
      />
    </>
  );
}
