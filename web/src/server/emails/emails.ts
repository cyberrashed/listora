import "server-only";
import { connectDb } from "../db";
import { type Actor, authorize } from "../staff/authorize";
import { Email, type EmailFields } from "./email.model";

type Message = Pick<EmailFields, "to" | "kind" | "subject" | "body">;

// Nothing leaves the machine. The message is recorded so the dashboard can
// show what would have been sent.
export async function sendEmail(message: Message) {
  await Email.create(message);
}

const PAGE_SIZE = 50;

export async function listEmails(actor: Actor, page = 1) {
  authorize(actor, "emails.view");
  await connectDb();

  const [items, total] = await Promise.all([
    Email.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    Email.countDocuments(),
  ]);

  return {
    total,
    page,
    pageSize: PAGE_SIZE,
    items: items.map((email) => ({
      id: String(email._id),
      to: email.to,
      kind: email.kind,
      subject: email.subject,
      body: email.body,
      sentAt: email.createdAt,
    })),
  };
}
