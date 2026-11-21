import { connection } from "next/server";
import { connectDb } from "@/server/db";

export async function GET() {
  await connection();

  try {
    const { connection: db } = await connectDb();
    await db.getClient().db().command({ ping: 1 });
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
