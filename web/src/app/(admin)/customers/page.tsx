import Link from "next/link";
import { requireStaff } from "@/features/auth/current-staff";
import { setCustomerStatusAction } from "@/features/customers/actions";
import { can } from "@/server/staff/authorize";
import { listCustomers } from "@/server/users/users";
import { Button, buttonClass } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
import { formatDate, plural } from "@/ui/format";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";
import { Pagination } from "@/ui/pagination";
import { Pill } from "@/ui/pill";
import { RowAction } from "@/ui/row-action";

export default async function CustomersPage({
  searchParams,
}: PageProps<"/customers">) {
  const actor = await requireStaff();
  if (!can(actor, "customers.view")) return <NoAccess title="Customers" />;

  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const page = Math.max(1, Number(params.page) || 1);

  const { items, total, pageSize } = await listCustomers(actor, {
    query,
    page,
  });
  const canManage = can(actor, "customers.manage");
  const pageHref = (target: number) =>
    `/customers?${new URLSearchParams({ ...(query && { q: query }), page: String(target) })}`;

  return (
    <>
      <PageHeader
        title="Customers"
        description={
          query
            ? `${plural(total, "match", "matches")} for “${query}”.`
            : `${plural(total, "customer")} ${total === 1 ? "has" : "have"} an account.`
        }
      />
      <form action="/customers" role="search" className="mb-4 flex gap-2">
        <label className="sr-only" htmlFor="customer-search">
          Search customers
        </label>
        <input
          id="customer-search"
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Name or email"
          className="border-control placeholder:text-muted h-8 w-64 rounded-control border px-2.5"
        />
        <Button type="submit">Search</Button>
        {query && (
          <Link href="/customers" className={buttonClass("quiet")}>
            Clear
          </Link>
        )}
      </form>
      {items.length === 0 ? (
        <EmptyState>No customer matches that search.</EmptyState>
      ) : (
        <table className="data-table max-w-[1000px]">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Phone</th>
              <th>Joined</th>
              <th>Status</th>
              {canManage && <th />}
            </tr>
          </thead>
          <tbody>
            {items.map((customer) => {
              const suspended = customer.status === "suspended";
              return (
                <tr key={customer.id}>
                  <td>
                    <span className="flex items-center gap-2 font-medium">
                      {customer.name}
                      {customer.verified && (
                        <Pill tone="positive">Verified</Pill>
                      )}
                    </span>
                    <span className="text-small text-muted block">
                      {customer.email}
                    </span>
                  </td>
                  {customer.phone ? (
                    <td className="whitespace-nowrap">{customer.phone}</td>
                  ) : (
                    <td className="empty text-muted">—</td>
                  )}
                  <td className="whitespace-nowrap">
                    {formatDate(customer.createdAt)}
                  </td>
                  <td>
                    {suspended ? (
                      <Pill tone="negative">Suspended</Pill>
                    ) : (
                      <span className="text-muted">Active</span>
                    )}
                  </td>
                  {canManage && (
                    <td className="end">
                      <RowAction
                        action={setCustomerStatusAction}
                        fields={{
                          id: customer.id,
                          status: suspended ? "active" : "suspended",
                        }}
                        label={suspended ? "Reinstate" : "Suspend"}
                      />
                    </td>
                  )}
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
        href={pageHref}
      />
    </>
  );
}
