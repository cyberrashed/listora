import Link from "next/link";
import { requireStaff } from "@/features/auth/current-staff";
import { teamTabs } from "@/features/team/tabs";
import { listActivity } from "@/server/activity/activity";
import { can } from "@/server/staff/authorize";
import { EmptyState } from "@/ui/empty-state";
import { formatDateTime } from "@/ui/format";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";
import { Pagination } from "@/ui/pagination";
import { Tabs } from "@/ui/tabs";

const verbs = {
  "listing.approved": "approved the listing",
  "listing.rejected": "rejected the listing",
  "report.resolved": "acted on a report about",
  "report.dismissed": "dismissed a report about",
  "review.hidden": "hid the review",
  "review.restored": "restored the review",
  "customer.suspended": "suspended",
  "customer.reinstated": "reinstated",
  "verification.approved": "verified",
  "verification.rejected": "turned down verification for",
  "package.granted": "gave the package",
  "settings.changed": "changed the",
  "announcement.sent": "sent the notification",
  "conversation.read": "read the conversation between",
} as const;

// Where each kind of entry can be looked at again.
const hrefs: Partial<Record<string, (id: string) => string>> = {
  listing: (id) => `/listings/${id}`,
  report: (id) => `/reports/${id}`,
};

export default async function ActivityPage({
  searchParams,
}: PageProps<"/team/activity">) {
  const actor = await requireStaff();
  if (!can(actor, "team.manage")) return <NoAccess title="Activity" />;

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const { items, total, pageSize } = await listActivity(actor, page);

  return (
    <>
      <PageHeader
        title="Team"
        description="Every decision the team makes on listings, reports, reviews and customers."
      />
      <Tabs items={teamTabs} current="/team/activity" />
      {items.length === 0 ? (
        <EmptyState>Nothing has been decided yet.</EmptyState>
      ) : (
        <table className="data-table max-w-[1000px]">
          <thead>
            <tr>
              <th>What happened</th>
              <th className="end">When</th>
            </tr>
          </thead>
          <tbody>
            {items.map((entry) => {
              const href = hrefs[entry.target.kind]?.(entry.target.id);
              return (
                <tr key={entry.id}>
                  <td className="wide">
                    <span className="font-medium">{entry.staffName}</span>{" "}
                    {verbs[entry.action]}{" "}
                    {href ? (
                      <Link href={href} className="hover:underline">
                        {entry.target.label}
                      </Link>
                    ) : (
                      entry.target.label
                    )}
                    {entry.note && (
                      <span className="text-small text-muted line-clamp-2 block max-w-[70ch]">
                        {entry.note}
                      </span>
                    )}
                  </td>
                  <td className="end whitespace-nowrap">
                    {formatDateTime(entry.at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <Pagination
        page={page}
        pageSize={pageSize}
        shown={items.length}
        total={total}
        href={(target) => `/team/activity?page=${target}`}
      />
    </>
  );
}
