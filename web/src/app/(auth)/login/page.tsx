import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/login-form";
import { Mark } from "@/ui/mark";

export const metadata: Metadata = { title: "Sign in · Listora Admin" };

export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <div className="bg-surface border-line w-full max-w-[380px] rounded-sheet border p-8">
        <p className="text-section flex items-center gap-2 font-semibold">
          <Mark />
          Listora
        </p>
        <h1 className="text-title mt-8 font-semibold tracking-[-0.01em]">
          Sign in to the back office
        </h1>
        <p className="text-muted mt-1 mb-6">
          Staff accounts are created by an owner.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
