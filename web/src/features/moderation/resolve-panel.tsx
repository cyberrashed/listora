"use client";

import { useActionState } from "react";
import type { Resolution } from "@/server/reports/reports";
import { SubmitButton } from "@/ui/submit-button";
import { resolveReportAction } from "./actions";

const labels: Record<Resolution, { title: string; note: string }> = {
  take_down: {
    title: "Take the listing down",
    note: "Rejected for good. The seller is told why.",
  },
  hide_review: {
    title: "Hide the review",
    note: "It leaves the seller's profile and rating.",
  },
  suspend: {
    title: "Suspend the account",
    note: "They are signed out everywhere and can't sign in.",
  },
  dismiss: {
    title: "Nothing to do",
    note: "It doesn't break the rules.",
  },
};

/** The decision on an open report, which settles every report on the same thing. */
export function ResolvePanel({
  id,
  options,
}: {
  id: string;
  options: Resolution[];
}) {
  const [state, action] = useActionState(resolveReportAction, undefined);

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="id" value={id} />
      <fieldset className="grid gap-2">
        <legend className="mb-2 font-medium">Decision</legend>
        {options.map((option, index) => (
          <label key={option} className="flex items-start gap-2.5">
            <input
              type="radio"
              name="resolution"
              value={option}
              defaultChecked={index === 0}
              className="accent-primary mt-0.5 size-4"
            />
            <span>
              {labels[option].title}
              <span className="text-small text-muted block">
                {labels[option].note}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      {state?.message && (
        <p role="alert" className="text-negative">
          {state.message}
        </p>
      )}
      <SubmitButton variant="primary">Decide</SubmitButton>
      <p className="text-small text-muted">
        The people who reported it hear back either way.
      </p>
    </form>
  );
}
