"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/ui/submit-button";
import { decideVerificationAction } from "./actions";

/** Approve a verification request, or turn it down with a reason. */
export function DecisionForm({ id }: { id: string }) {
  const [state, action] = useActionState(decideVerificationAction, undefined);
  const error = state?.errors?.reason;

  return (
    <div className="grid gap-3">
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="approve" value="true" />
        <SubmitButton variant="primary" className="w-full">
          Approve
        </SubmitButton>
      </form>
      <form action={action} className="grid gap-2">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="approve" value="false" />
        <label htmlFor={`reason-${id}`} className="sr-only">
          Reason for turning it down
        </label>
        <textarea
          id={`reason-${id}`}
          name="reason"
          rows={2}
          placeholder="Why it can't be approved"
          defaultValue={state?.values?.reason}
          aria-invalid={error ? true : undefined}
          className="border-control bg-surface aria-invalid:border-negative w-full rounded-control border px-3 py-2"
        />
        {(error ?? state?.message) && (
          <p role="alert" className="text-negative">
            {error ?? state?.message}
          </p>
        )}
        <SubmitButton variant="secondary">Turn down</SubmitButton>
      </form>
    </div>
  );
}
