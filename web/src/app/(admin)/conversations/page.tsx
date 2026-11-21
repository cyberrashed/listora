import Link from "next/link";
import { requireStaff } from "@/features/auth/current-staff";
import { findConversations } from "@/server/chat/oversight";
import { can } from "@/server/staff/authorize";
import { Button } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
import { formatDateTime } from "@/ui/format";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";

export default async function ConversationsPage({
  searchParams,
}: PageProps<"/conversations">) {
  const actor = await requireStaff();
  if (!can(actor, "reports.handle")) return <NoAccess title="Conversations" />;

  const email = (await searchParams).email;
  const query = typeof email === "string" ? email : "";
  const found = query ? await findConversations(actor, query) : null;

  return (
    <>
      <PageHeader
        title="Conversations"
        description="Customers' chats are private. Open one only to settle a report; every conversation you read is logged under Team."
      />
      <form action="/conversations" role="search" className="mb-6 flex gap-2">
        <label className="sr-only" htmlFor="conversation-email">
          Customer&apos;s email
        </label>
        <input
          id="conversation-email"
          type="email"
          name="email"
          defaultValue={query}
          placeholder="Customer's email"
          className="border-control placeholder:text-muted h-8 w-72 rounded-control border px-2.5"
        />
        <Button type="submit">Find</Button>
      </form>
      {found === null ? (
        <EmptyState>Look up the customer a report is about.</EmptyState>
      ) : !found.customer ? (
        <EmptyState>No customer has that email.</EmptyState>
      ) : found.items.length === 0 ? (
        <EmptyState>{found.customer.name} has no conversations.</EmptyState>
      ) : (
        <table className="data-table max-w-[1000px]">
          <thead>
            <tr>
              <th>About</th>
              <th>Between</th>
              <th className="end">Last message</th>
            </tr>
          </thead>
          <tbody>
            {found.items.map((row) => (
              <tr key={row.id}>
                <td className="wide">
                  <Link
                    href={`/conversations/${row.id}`}
                    className="font-medium hover:underline"
                  >
                    {row.listingTitle}
                  </Link>
                </td>
                <td>
                  {row.buyer} and {row.seller}
                </td>
                <td className="end whitespace-nowrap">
                  {formatDateTime(row.lastAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
