import "server-only";
import type { Types } from "mongoose";
import { connectDb } from "../db";
import { type Actor, authorize } from "../staff/authorize";
import { Activity, type ActivityFields } from "./activity.model";

type Entry = Pick<ActivityFields, "action" | "note"> & {
  target: {
    kind: ActivityFields["target"]["kind"];
    id: Types.ObjectId;
    label: string;
  };
};

/** Notes a staff action in the log. Called by the service that did it. */
export async function record(actor: Actor, entry: Entry) {
  await Activity.create({ staffId: actor.id, staffName: actor.name, ...entry });
}

const PAGE_SIZE = 50;

export async function listActivity(actor: Actor, page = 1) {
  authorize(actor, "team.manage");
  await connectDb();

  const [items, total] = await Promise.all([
    Activity.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    Activity.countDocuments(),
  ]);

  return {
    total,
    page,
    pageSize: PAGE_SIZE,
    items: items.map((entry) => ({
      id: String(entry._id),
      staffName: entry.staffName,
      action: entry.action,
      target: {
        kind: entry.target.kind,
        id: String(entry.target.id),
        label: entry.target.label,
      },
      note: entry.note ?? null,
      at: entry.createdAt.toISOString(),
    })),
  };
}
