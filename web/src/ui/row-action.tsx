"use client";

import { useActionState } from "react";
import type { FormState } from "@/features/form-state";
import { SubmitButton } from "./submit-button";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

// One button that runs a server action on one row and shows the reason when
// the action is refused.
export function RowAction({
  action,
  fields,
  label,
  danger,
}: {
  action: Action;
  fields: Record<string, string>;
  label: string;
  danger?: boolean;
}) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SubmitButton variant={danger ? "danger" : "secondary"}>
        {label}
      </SubmitButton>
      {state?.message && (
        <p
          role="alert"
          className="text-small text-negative max-w-56 text-right"
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
