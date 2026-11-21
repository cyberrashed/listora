import Link from "next/link";
import { requireStaff } from "@/features/auth/current-staff";
import { readConversation } from "@/server/chat/oversight";
import { can } from "@/server/staff/authorize";
import { formatDateTime, formatMoney } from "@/ui/format";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";

const offerLines = {
  offer: "offered",
  offer_accepted: "accepted the offer of",
  offer_declined: "declined the offer of",
} as const;

export default async function ConversationPage({
  params,
}: PageProps<"/conversations/[id]">) {
  const actor = await requireStaff();
  if (!can(actor, "reports.handle")) return <NoAccess title="Conversation" />;

  const conversation = await readConversation(actor, (await params).id);
  const who = (id: string) =>
    id === conversation.buyer?.id
      ? conversation.buyer.name
      : id === conversation.seller?.id
        ? conversation.seller.name
        : "Former member";

  return (
    <>
      <PageHeader
        title={`${conversation.buyer?.name ?? "Former member"} and ${conversation.seller?.name ?? "Former member"}`}
        description={
          conversation.listing
            ? `About “${conversation.listing.title}”. You opening this is logged.`
            : "The listing was removed. You opening this is logged."
        }
      >
        {conversation.listing && (
          <Link
            href={`/listings/${conversation.listing.id}`}
            className="hover:underline"
          >
            Open the listing
          </Link>
        )}
      </PageHeader>
      <ol className="grid max-w-[720px] gap-3">
        {conversation.messages.map((message) => (
          <li
            key={message.id}
            className="border-line rounded-card border px-4 py-3"
          >
            <p className="text-small text-muted">
              <span className="text-ink font-medium">
                {who(message.senderId)}
              </span>
              {" · "}
              {formatDateTime(message.createdAt)}
            </p>
            <p className="mt-1 whitespace-pre-line">
              {message.kind === "text"
                ? message.text
                : `${who(message.senderId)} ${offerLines[message.kind]} ${formatMoney(message.cents ?? 0)}.`}
            </p>
          </li>
        ))}
      </ol>
    </>
  );
}
