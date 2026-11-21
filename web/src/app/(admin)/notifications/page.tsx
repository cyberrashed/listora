import { requireStaff } from "@/features/auth/current-staff";
import { AnnouncementForm } from "@/features/content/forms";
import { listEmails } from "@/server/emails/emails";
import { can } from "@/server/staff/authorize";
import { EmptyState } from "@/ui/empty-state";
import { formatDateTime, plural } from "@/ui/format";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";

export default async function NotificationsPage() {
  const actor = await requireStaff();
  const canSend = can(actor, "content.manage");
  if (!can(actor, "emails.view") && !canSend) {
    return <NoAccess title="Notifications" />;
  }

  const { items, total } = can(actor, "emails.view")
    ? await listEmails(actor)
    : { items: [], total: 0 };

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Messages to customers in the app, and every email the system would have sent. This build sends no real email."
      />
      {canSend && (
        <section className="bg-raised rounded-sheet mb-10 max-w-[560px] p-4">
          <h2 className="text-section mb-1 font-medium">Send a notification</h2>
          <p className="text-small text-muted mb-4">
            It lands in the app&apos;s notification centre, and on the phone of
            anyone who has the app open.
          </p>
          <AnnouncementForm />
        </section>
      )}
      <h2 className="text-section mb-2 font-medium">
        Email log
        <span className="text-muted ml-2 font-normal">
          {plural(total, "message")}
        </span>
      </h2>
      {items.length === 0 ? (
        <EmptyState>
          Nothing has been sent yet. A welcome email appears here when someone
          registers.
        </EmptyState>
      ) : (
        <table className="data-table max-w-[1000px]">
          <thead>
            <tr>
              <th>Sent</th>
              <th>To</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {items.map((email) => (
              <tr key={email.id}>
                <td className="whitespace-nowrap">
                  {formatDateTime(email.sentAt)}
                </td>
                <td>{email.to}</td>
                <td className="wide">
                  <span className="font-medium">{email.subject}</span>
                  <span className="text-muted block">{email.body}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
