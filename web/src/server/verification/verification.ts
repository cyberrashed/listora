import "server-only";
import { z } from "zod";
import { record } from "../activity/activity";
import { connectDb, isObjectId } from "../db";
import { AppError } from "../errors";
import { notify } from "../notifications/notifications";
import { type Actor, authorize } from "../staff/authorize";
import { User, type UserDoc } from "../users/user.model";
import { Verification, type VerificationFields } from "./verification.model";

export const verificationInput = z.object({
  legalName: z
    .string()
    .trim()
    .min(2, "Enter your full legal name.")
    .max(80, "Use 80 characters or fewer."),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number."),
  about: z
    .string()
    .trim()
    .min(20, "Say a little more: at least 20 characters.")
    .max(1000, "Use 1,000 characters or fewer."),
});

export const decisionInput = z.discriminatedUnion("approve", [
  z.object({ approve: z.literal(true) }),
  z.object({
    approve: z.literal(false),
    reason: z
      .string()
      .trim()
      .min(5, "Tell them why.")
      .max(300, "Use 300 characters or fewer."),
  }),
]);

type VerificationRow = VerificationFields & { _id: unknown };

function toRequestDto(row: VerificationRow) {
  return {
    id: String(row._id),
    status: row.status,
    reason: row.reason ?? null,
    requestedAt: row.createdAt.toISOString(),
    decidedAt: row.decidedAt?.toISOString() ?? null,
  };
}

/** Where the person stands: verified, waiting, turned down or not asked. */
export async function myVerification(user: UserDoc) {
  await connectDb();
  const latest = await Verification.findOne({ userId: user._id })
    .sort({ createdAt: -1 })
    .lean();
  return {
    verified: user.verified,
    request: latest ? toRequestDto(latest) : null,
  };
}

export async function requestVerification(
  user: UserDoc,
  input: z.infer<typeof verificationInput>,
) {
  await connectDb();
  if (user.verified) {
    throw new AppError("conflict", "Your account is already verified.");
  }
  if (await Verification.exists({ userId: user._id, status: "pending" })) {
    throw new AppError("conflict", "Your request is already being reviewed.");
  }
  await Verification.create({ userId: user._id, ...input });
  return myVerification(user);
}

const PAGE_SIZE = 25;

export async function listVerifications(
  actor: Actor,
  {
    status = "pending",
    page = 1,
  }: { status?: "pending" | "approved" | "rejected"; page?: number },
) {
  authorize(actor, "verification.review");
  await connectDb();

  const [rows, total, pending] = await Promise.all([
    Verification.find({ status })
      .sort({ createdAt: status === "pending" ? 1 : -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    Verification.countDocuments({ status }),
    Verification.countDocuments({ status: "pending" }),
  ]);
  const people = await User.find({
    _id: { $in: rows.map((row) => row.userId) },
  }).lean();
  const byId = new Map(people.map((row) => [String(row._id), row]));

  return {
    total,
    page,
    pageSize: PAGE_SIZE,
    pending,
    items: rows.map((row) => {
      const person = byId.get(String(row.userId));
      return {
        ...toRequestDto(row),
        legalName: row.legalName,
        phone: row.phone,
        about: row.about,
        decidedBy: row.decidedBy ?? null,
        customer: person
          ? {
              id: String(person._id),
              name: person.name,
              email: person.email,
              joinedAt: person.createdAt.toISOString(),
            }
          : null,
      };
    }),
  };
}

export async function decideVerification(
  actor: Actor,
  id: string,
  decision: z.infer<typeof decisionInput>,
) {
  authorize(actor, "verification.review");
  await connectDb();

  const request = isObjectId(id) ? await Verification.findById(id) : null;
  if (!request) {
    throw new AppError("not_found", "That request no longer exists.");
  }
  if (request.status !== "pending") {
    throw new AppError("conflict", "That request has already been decided.");
  }
  const person = await User.findById(request.userId);
  if (!person) throw new AppError("not_found", "That customer left Listora.");

  request.status = decision.approve ? "approved" : "rejected";
  request.reason = decision.approve ? undefined : decision.reason;
  request.decidedBy = actor.name;
  request.decidedAt = new Date();
  await request.save();
  if (decision.approve) {
    person.verified = true;
    await person.save();
  }

  await record(actor, {
    action: decision.approve
      ? "verification.approved"
      : "verification.rejected",
    target: { kind: "verification", id: request._id, label: person.name },
    note: decision.approve ? undefined : decision.reason,
  });
  await notify(person._id, {
    kind: "verification_decided",
    title: decision.approve ? "You're verified" : "Verification not approved",
    body: decision.approve
      ? "Buyers now see a verified badge on your profile and listings."
      : `You can send a new request. Reason: ${decision.reason}`,
    link: "/account/verification",
  });
}
