import "server-only";
import { z } from "zod";
import { record } from "../activity/activity";
import { connectDb, isObjectId } from "../db";
import { AppError } from "../errors";
import { Listing } from "../listings/listing.model";
import { rejectListing } from "../listings/listings";
import { notify } from "../notifications/notifications";
import { Review } from "../reviews/review.model";
import { setReviewHidden } from "../reviews/reviews";
import { type Actor, authorize } from "../staff/authorize";
import { User, type UserDoc } from "../users/user.model";
import { setCustomerStatus } from "../users/users";
import {
  Report,
  type ReportFields,
  type ReportReason,
  reportReasons,
  reportTargets,
} from "./report.model";

export const reportInput = z.object({
  kind: z.enum(reportTargets),
  id: z.string().refine(isObjectId, "That can't be reported."),
  reason: z.enum(
    Object.keys(reportReasons) as [ReportReason, ...ReportReason[]],
    "Choose a reason.",
  ),
  note: z.string().trim().max(500, "Keep it under 500 characters."),
});

type Target = z.infer<typeof reportInput>["kind"];

const gone = () => new AppError("not_found", "That is no longer on Listora.");

// What is being reported, who is behind it and how to name it.
async function describe(kind: Target, id: string) {
  switch (kind) {
    case "listing": {
      const listing = await Listing.findById(id).lean();
      if (!listing) throw gone();
      return { label: listing.title, ownerId: listing.sellerId };
    }
    case "review": {
      const review = await Review.findById(id).lean();
      if (!review) throw gone();
      return {
        label:
          review.text ||
          `${review.rating} of 5 stars on “${review.listingTitle}”`,
        ownerId: review.reviewerId,
      };
    }
    case "user": {
      const person = await User.findById(id).lean();
      if (!person) throw gone();
      return { label: person.name, ownerId: person._id };
    }
  }
}

/** Files a report. Reporting the same thing again while it is open is a no-op. */
export async function fileReport(
  reporter: UserDoc,
  input: z.infer<typeof reportInput>,
) {
  await connectDb();

  const { label, ownerId } = await describe(input.kind, input.id);
  if (ownerId.equals(reporter._id)) {
    throw new AppError("validation", "You can't report your own.");
  }

  await Report.updateOne(
    {
      reporterId: reporter._id,
      "target.kind": input.kind,
      "target.id": input.id,
      status: "open",
    },
    {
      $setOnInsert: {
        reporterId: reporter._id,
        target: { kind: input.kind, id: input.id, label },
        status: "open",
      },
      $set: { reason: input.reason, note: input.note },
    },
    { upsert: true },
  );
}

export const resolutions = {
  take_down: "Take the listing down",
  hide_review: "Hide the review",
  suspend: "Suspend the account",
  dismiss: "Nothing to do",
} as const;

export type Resolution = keyof typeof resolutions;

/** What staff can do about a report, by what it is about. */
function resolutionsFor(kind: Target) {
  const options: Record<Target, Resolution[]> = {
    listing: ["take_down", "suspend", "dismiss"],
    review: ["hide_review", "suspend", "dismiss"],
    user: ["suspend", "dismiss"],
  };
  return options[kind];
}

type ReportRow = ReportFields & { _id: unknown };

function toReportDto(report: ReportRow, reporterName: string) {
  return {
    id: String(report._id),
    target: {
      kind: report.target.kind,
      id: String(report.target.id),
      label: report.target.label,
    },
    reason: report.reason as ReportReason,
    reasonLabel: reportReasons[report.reason as ReportReason],
    note: report.note,
    status: report.status,
    reporterName,
    filedAt: report.createdAt.toISOString(),
    resolution: report.resolution
      ? {
          staffName: report.resolution.staffName,
          action: report.resolution.action as Resolution,
          at: report.resolution.at.toISOString(),
        }
      : null,
  };
}

const PAGE_SIZE = 25;
const statuses = ["open", "resolved", "dismissed"] as const;

export async function listReports(
  actor: Actor,
  {
    status = "open",
    page = 1,
  }: { status?: (typeof statuses)[number]; page?: number },
) {
  authorize(actor, "reports.handle");
  await connectDb();

  const [rows, total, grouped] = await Promise.all([
    Report.find({ status })
      // Open reports are worked oldest first; the rest newest first.
      .sort({ createdAt: status === "open" ? 1 : -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    Report.countDocuments({ status }),
    Report.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);
  const names = await reporterNames(rows);

  return {
    items: rows.map((row) =>
      toReportDto(row, names.get(String(row.reporterId)) ?? "Former member"),
    ),
    total,
    page,
    pageSize: PAGE_SIZE,
    counts: Object.fromEntries(
      statuses.map((name) => [
        name,
        grouped.find((group) => group._id === name)?.count ?? 0,
      ]),
    ) as Record<(typeof statuses)[number], number>,
  };
}

async function reporterNames(rows: ReportRow[]) {
  const people = await User.find({
    _id: { $in: rows.map((row) => row.reporterId) },
  }).lean();
  return new Map(people.map((row) => [String(row._id), row.name]));
}

/** A report with what it is about as it stands now, for deciding on it. */
export async function getReport(actor: Actor, id: string) {
  authorize(actor, "reports.handle");
  await connectDb();

  const report = isObjectId(id) ? await Report.findById(id).lean() : null;
  if (!report) throw new AppError("not_found", "That report no longer exists.");
  const [names, others] = await Promise.all([
    reporterNames([report]),
    Report.countDocuments({
      "target.kind": report.target.kind,
      "target.id": report.target.id,
      status: "open",
      _id: { $ne: report._id },
    }),
  ]);

  return {
    ...toReportDto(
      report,
      names.get(String(report.reporterId)) ?? "Former member",
    ),
    otherOpenReports: others,
    current: await currentTarget(report.target.kind, String(report.target.id)),
    resolutions: resolutionsFor(report.target.kind),
  };
}

async function currentTarget(kind: Target, id: string) {
  switch (kind) {
    case "listing": {
      const listing = await Listing.findById(id).lean();
      if (!listing) return null;
      const seller = await User.findById(listing.sellerId).lean();
      return {
        kind,
        title: listing.title,
        description: listing.description,
        status: listing.status,
        owner: seller
          ? { id: String(seller._id), name: seller.name, status: seller.status }
          : null,
      };
    }
    case "review": {
      const review = await Review.findById(id).lean();
      if (!review) return null;
      const reviewer = await User.findById(review.reviewerId).lean();
      return {
        kind,
        title: `${review.rating} of 5 stars on “${review.listingTitle}”`,
        description: review.text,
        status: review.hidden ? "hidden" : "visible",
        owner: reviewer
          ? {
              id: String(reviewer._id),
              name: reviewer.name,
              status: reviewer.status,
            }
          : null,
      };
    }
    case "user": {
      const person = await User.findById(id).lean();
      if (!person) return null;
      return {
        kind,
        title: person.name,
        description: person.email,
        status: person.status,
        owner: {
          id: String(person._id),
          name: person.name,
          status: person.status,
        },
      };
    }
  }
}

/**
 * Settles a report and every other open report on the same thing, after
 * doing what was decided. The person who reported hears back.
 */
export async function resolveReport(
  actor: Actor,
  id: string,
  resolution: Resolution,
) {
  authorize(actor, "reports.handle");
  await connectDb();

  const report = isObjectId(id) ? await Report.findById(id) : null;
  if (!report) throw new AppError("not_found", "That report no longer exists.");
  if (report.status !== "open") {
    throw new AppError("conflict", "That report has already been handled.");
  }
  const kind = report.target.kind;
  if (!resolutionsFor(kind).includes(resolution)) {
    throw new AppError("validation", "That can't be done to this report.");
  }

  const reason = reportReasons[report.reason as ReportReason];
  const targetId = String(report.target.id);
  switch (resolution) {
    case "take_down":
      await rejectListing(actor, targetId, {
        kind: "permanent",
        reason: `Taken down after a report: ${reason.toLowerCase()}.`,
      });
      break;
    case "hide_review":
      await setReviewHidden(actor, targetId, true, `Reported: ${reason}`);
      break;
    case "suspend": {
      const target = await currentTarget(kind, targetId);
      if (!target?.owner) throw gone();
      await setCustomerStatus(actor, target.owner.id, "suspended");
      break;
    }
    case "dismiss":
      break;
  }

  const status = resolution === "dismiss" ? "dismissed" : "resolved";
  const settled = await Report.find({
    "target.kind": kind,
    "target.id": report.target.id,
    status: "open",
  }).lean();
  await Report.updateMany(
    { _id: { $in: settled.map((row) => row._id) } },
    {
      status,
      resolution: { staffName: actor.name, action: resolution, at: new Date() },
    },
  );

  await record(actor, {
    action: status === "dismissed" ? "report.dismissed" : "report.resolved",
    target: { kind: "report", id: report._id, label: report.target.label },
    note: `${reason}. ${resolutions[resolution]}.`,
  });
  for (const row of settled) {
    await notify(row.reporterId, {
      kind: "report_resolved",
      title: "About your report",
      body:
        status === "resolved"
          ? `Thanks. We looked into “${row.target.label}” and took action.`
          : `Thanks. We looked into “${row.target.label}” and it doesn't break our rules.`,
    });
  }
}
