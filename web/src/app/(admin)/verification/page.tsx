import { requireStaff } from "@/features/auth/current-staff";
import { DecisionForm } from "@/features/moderation/decision-form";
import { can } from "@/server/staff/authorize";
import { listVerifications } from "@/server/verification/verification";
import { EmptyState } from "@/ui/empty-state";
import { formatDate, plural, timeSince } from "@/ui/format";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";
import { Pagination } from "@/ui/pagination";
import { Pill } from "@/ui/pill";
import { Tabs } from "@/ui/tabs";

const statuses = [
  { name: "pending", label: "Waiting" },
  { name: "approved", label: "Approved" },
  { name: "rejected", label: "Turned down" },
] as const;

export default async function VerificationPage({
  searchParams,
}: PageProps<"/verification">) {
  const actor = await requireStaff();
  if (!can(actor, "verification.review")) {
    return <NoAccess title="Verification" />;
  }

  const params = await searchParams;
  const status =
    statuses.find((item) => item.name === params.status)?.name ?? "pending";
  const page = Math.max(1, Number(params.page) || 1);
  const { items, total, pageSize, pending } = await listVerifications(actor, {
    status,
    page,
  });

  return (
    <>
      <PageHeader
        title="Verification"
        description={
          pending === 0
            ? "No seller is waiting. Approved sellers get a badge buyers can see."
            : `${plural(pending, "seller")} ${pending === 1 ? "is" : "are"} waiting to be verified.`
        }
      />
      <Tabs
        items={statuses.map((item) => ({
          href: `/verification?status=${item.name}`,
          label: item.label,
        }))}
        current={`/verification?status=${status}`}
      />
      {items.length === 0 ? (
        <EmptyState>Nothing here.</EmptyState>
      ) : (
        <ul className="grid max-w-[900px] gap-4">
          {items.map((request) => (
            <li
              key={request.id}
              className="border-line rounded-card grid gap-4 border p-4 md:grid-cols-[minmax(0,1fr)_280px]"
            >
              <div>
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {request.customer?.name ?? "Former member"}
                  </span>
                  {request.status === "approved" && (
                    <Pill tone="positive">Verified</Pill>
                  )}
                  {request.status === "rejected" && (
                    <Pill tone="negative">Turned down</Pill>
                  )}
                </p>
                <p className="text-small text-muted">
                  {request.customer?.email}
                  {request.customer &&
                    ` · member since ${formatDate(request.customer.joinedAt)}`}
                </p>
                <dl className="mt-3 grid gap-1">
                  <div>
                    <dt className="text-small text-muted">Legal name</dt>
                    <dd>{request.legalName}</dd>
                  </div>
                  <div>
                    <dt className="text-small text-muted">Phone</dt>
                    <dd>{request.phone}</dd>
                  </div>
                  <div>
                    <dt className="text-small text-muted">How they sell</dt>
                    <dd className="max-w-[60ch]">{request.about}</dd>
                  </div>
                </dl>
              </div>
              <div className="text-small">
                {request.status === "pending" ? (
                  <>
                    <p className="text-muted mb-3">
                      Asked {timeSince(request.requestedAt)} ago
                    </p>
                    <DecisionForm id={request.id} />
                  </>
                ) : (
                  <p className="text-muted">
                    {request.status === "approved" ? "Approved" : "Turned down"}{" "}
                    by {request.decidedBy}
                    {request.decidedAt &&
                      ` on ${formatDate(request.decidedAt)}`}
                    {request.reason && (
                      <span className="text-ink mt-1 block">
                        “{request.reason}”
                      </span>
                    )}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={page}
        pageSize={pageSize}
        shown={items.length}
        total={total}
        href={(target) => `/verification?status=${status}&page=${target}`}
      />
    </>
  );
}
