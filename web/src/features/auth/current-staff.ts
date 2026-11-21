import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { findActor } from "@/server/staff/staff-auth";

export const SESSION_COOKIE = "listora_staff";

export const currentStaff = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  // A session is checked against the clock, so it is never read ahead of
  // the request itself.
  await connection();
  return findActor(token);
});

// Every dashboard page starts here. Layouts are not re-run on navigation, so
// the check cannot live in one.
export async function requireStaff() {
  const actor = await currentStaff();
  if (!actor) redirect("/login");
  return actor;
}
