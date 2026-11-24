"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/ui/submit-button";
import { demoSignInAction } from "./actions";

type DemoAccount = { key: string; role: string; does: string };

// One button per seeded staff account. The server signs the visitor in, so
// no password reaches the browser.
export function DemoSignIn({ accounts }: { accounts: DemoAccount[] }) {
  const [state, action] = useActionState(demoSignInAction, undefined);

  return (
    <div className="grid gap-2">
      {accounts.map((account) => (
        <form key={account.key} action={action}>
          <input type="hidden" name="account" value={account.key} />
          <SubmitButton className="h-auto w-full gap-4 py-2.5 text-left whitespace-normal">
            <span className="flex-1">
              <span className="block">Enter as {account.role}</span>
              <span className="text-small text-muted block font-normal">
                {account.does}
              </span>
            </span>
            <span aria-hidden className="text-muted">
              →
            </span>
          </SubmitButton>
        </form>
      ))}
      {state?.message && (
        <p role="alert" className="text-negative">
          {state.message}
        </p>
      )}
    </div>
  );
}
