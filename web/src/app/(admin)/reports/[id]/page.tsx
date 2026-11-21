import Link from "next/link";
import { requireStaff } from "@/features/auth/current-staff";
import { ResolvePanel } from "@/features/moderation/resolve-panel";
import { getReport, resolutions } from "@/server/reports/reports";
import { can } from "@/server/staff/authorize";
import { formatDateTime, plural, timeSince } from "@/ui/format";
import { NoAccess } from "@/ui/no-access";
import { Pill } from "@/ui/pill";

const kinds = { listing: "Listing", review: "Review", user: "Account" };

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

export default async function ReportPage({
  params,
}: PageProps<"/reports/[id]">) {
  const actor = await requireStaff();
  if (!can(actor, "reports.handle")) return <NoAccess title="Report" />;

  const report = await getReport(actor, (await params).id);
  const { current } = report;

  return (
    <div className="grid max-w-[1100px] gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
      <article>
        <p className="text-small text-muted">
          <Link href="/reports" className="hover:underline">
            Reports
          </Link>{" "}
          › {kinds[report.target.kind]}
        </p>
        <h1 className="text-title mt-1 font-semibold tracking-[-0.01em]">
          {report.reasonLabel}
        </h1>
        <p className="text-muted mt-1">
          {report.reporterName} reported this {timeSince(report.filedAt)} ago.
          {report.otherOpenReports > 0 &&
            ` ${plural(report.otherOpenReports, "other person", "other people")} reported it too.`}
        </p>
        {report.note && (
          <blockquote className="border-line mt-4 max-w-[65ch] border-l-2 pl-4">
            {report.note}
          </blockquote>
        )}

        <h2 className="text-section mt-8 mb-2 font-medium">
          {kinds[report.target.kind]} as it is now
        </h2>
        {current ? (
          <div className="border-line rounded-card max-w-[65ch] border p-4">
            <p className="flex flex-wrap items-center gap-2 font-medium">
              {report.target.kind === "listing" ? (
                <Link
                  href={`/listings/${report.target.id}`}
                  className="hover:underline"
                >
                  {current.title}
                </Link>
              ) : (
                current.title
              )}
              <Pill
                tone={
                  ["active", "visible"].includes(current.status)
                    ? "positive"
                    : "neutral"
                }
              >
                {current.status.replace("_", " ")}
              </Pill>
            </p>
            {current.description && (
              <p className="text-muted mt-2 line-clamp-6 whitespace-pre-line">
                {current.description}
              </p>
            )}
          </div>
        ) : (
          <p className="text-muted">It has been deleted since.</p>
        )}
      </article>
      <aside className="grid content-start gap-8">
        <section>
          <h2 className="text-section mb-1 font-medium">Account behind it</h2>
          {current?.owner ? (
            <dl className="divide-rule divide-y">
              <Fact label="Name">{current.owner.name}</Fact>
              <Fact label="Status">
                {current.owner.status === "suspended" ? (
                  <Pill tone="negative">Suspended</Pill>
                ) : (
                  "Active"
                )}
              </Fact>
            </dl>
          ) : (
            <p className="text-muted">The account was deleted.</p>
          )}
        </section>
        {report.status === "open" ? (
          <section className="bg-raised rounded-sheet p-4">
            <ResolvePanel id={report.id} options={report.resolutions} />
          </section>
        ) : (
          report.resolution && (
            <section>
              <h2 className="text-section mb-1 font-medium">Decision</h2>
              <dl className="divide-rule divide-y">
                <Fact label="Outcome">
                  {resolutions[report.resolution.action]}
                </Fact>
                <Fact label="By">{report.resolution.staffName}</Fact>
                <Fact label="When">{formatDateTime(report.resolution.at)}</Fact>
              </dl>
            </section>
          )
        )}
      </aside>
    </div>
  );
}
