import { requireStaff } from "@/features/auth/current-staff";
import { listPayments } from "@/server/packages/packages";
import { can } from "@/server/staff/authorize";
import { EmptyState } from "@/ui/empty-state";
import { formatDateTime, formatMoney, plural } from "@/ui/format";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";
import { Pagination } from "@/ui/pagination";

export default async function PaymentsPage({
  searchParams,
}: PageProps<"/payments">) {
  const actor = await requireStaff();
  if (!can(actor, "payments.view")) return <NoAccess title="Payments" />;

  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { items, total, pageSize, month } = await listPayments(actor, page);

  return (
    <>
      <PageHeader
        title="Payments"
        description="Card payments through Stripe, in test mode. A package is handed over only when Stripe confirms the payment."
      />
      <dl className="mb-6 grid max-w-[600px] grid-cols-2 gap-2">
        <div className="border-line rounded-card border px-3 py-2.5">
          <dt className="text-muted text-[13px]">This month</dt>
          <dd className="text-section font-semibold tabular-nums">
            {formatMoney(month.cents)}
          </dd>
        </div>
        <div className="border-line rounded-card border px-3 py-2.5">
          <dt className="text-muted text-[13px]">Sales this month</dt>
          <dd className="text-section font-semibold tabular-nums">
            {month.count}
          </dd>
        </div>
      </dl>
      {items.length === 0 ? (
        <EmptyState>No one has paid for a package yet.</EmptyState>
      ) : (
        <table className="data-table max-w-[1000px]">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Package</th>
              <th className="end">Amount</th>
              <th className="end">Paid</th>
            </tr>
          </thead>
          <tbody>
            {items.map((payment) => (
              <tr key={payment.id}>
                <td>
                  <span className="font-medium">
                    {payment.customer?.name ?? "Former member"}
                  </span>
                  <span className="text-small text-muted block">
                    {payment.customer?.email}
                  </span>
                </td>
                <td>{payment.packageName}</td>
                <td className="end whitespace-nowrap tabular-nums">
                  {formatMoney(payment.amountCents)}
                </td>
                <td className="end whitespace-nowrap">
                  {formatDateTime(payment.paidAt)}
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
        href={(target) => `/payments?page=${target}`}
      />
      {total > 0 && (
        <p className="text-small text-muted mt-3">
          {plural(total, "payment")} in all.
        </p>
      )}
    </>
  );
}
