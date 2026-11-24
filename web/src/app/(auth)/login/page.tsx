import type { Metadata } from "next";
import { DemoSignIn } from "@/features/auth/demo-sign-in";
import { LoginForm } from "@/features/auth/login-form";
import { demoAccounts, demoMode } from "@/server/demo";
import { Mark } from "@/ui/mark";

export const metadata: Metadata = { title: "Sign in · Listora Admin" };

export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <div className="bg-surface border-line w-full max-w-[400px] rounded-sheet border p-8">
        <p className="text-section flex items-center gap-2 font-semibold">
          <Mark />
          Listora
        </p>
        {demoMode() ? <DemoIntro /> : <SignIn />}
      </div>
    </main>
  );
}

function SignIn() {
  return (
    <>
      <h1 className="text-title mt-8 font-semibold tracking-[-0.01em]">
        Sign in to the back office
      </h1>
      <p className="text-muted mt-1 mb-6">
        Staff accounts are created by an owner.
      </p>
      <LoginForm />
    </>
  );
}

function DemoIntro() {
  const accounts = Object.entries(demoAccounts).map(([key, account]) => ({
    key,
    role: account.role,
    does: account.does,
  }));

  return (
    <>
      <h1 className="text-title mt-8 font-semibold tracking-[-0.01em]">
        Explore the back office
      </h1>
      <p className="text-muted mt-1 mb-6">
        A public demo of the marketplace&apos;s admin. Pick a role to sign in as
        one of the team.
      </p>
      <DemoSignIn accounts={accounts} />
      <p className="text-small text-muted mt-6">
        Anyone can open these accounts. The data goes back to the seed every
        day, and changes to the team and the settings are turned off.
      </p>
      <details className="border-line mt-6 border-t pt-4">
        <summary className="text-muted hover:text-ink cursor-pointer">
          Sign in with a password
        </summary>
        <div className="mt-4">
          <LoginForm />
        </div>
      </details>
    </>
  );
}
