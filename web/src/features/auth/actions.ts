"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { credentials } from "@/server/auth/schemas";
import { isDemoAccount } from "@/server/demo";
import { rateLimit } from "@/server/rate-limit";
import { signIn, signInDemo, signOut } from "@/server/staff/staff-auth";
import { failed, type FormState, invalid, keep } from "../form-state";
import { SESSION_COOKIE } from "./current-staff";

async function clientAddress() {
  return (
    (await headers()).get("x-forwarded-for")?.split(",")[0].trim() ?? "local"
  );
}

async function startSession(session: { token: string; expiresAt: Date }) {
  (await cookies()).set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: session.expiresAt,
    path: "/",
  });
}

export async function signInAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const input = credentials.safeParse(Object.fromEntries(formData));
  const values = keep(formData, "email");
  if (!input.success) return { ...invalid(input.error), values };

  let session;
  try {
    await rateLimit(`staff-login:${await clientAddress()}`, 10, 60);
    session = await signIn(input.data);
  } catch (error) {
    return { ...failed(error), values };
  }

  await startSession(session);
  redirect("/");
}

export async function demoSignInAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const account = formData.get("account");
  if (!isDemoAccount(account)) return { message: "Choose an account." };

  let session;
  try {
    await rateLimit(`demo-login:${await clientAddress()}`, 20, 60);
    session = await signInDemo(account);
  } catch (error) {
    return failed(error);
  }

  await startSession(session);
  redirect("/");
}

export async function signOutAction() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await signOut(token);
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
