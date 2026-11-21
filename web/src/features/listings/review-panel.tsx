"use client";

import { useActionState } from "react";
import type { ListingStatus } from "@/server/listings/lifecycle";
import { SubmitButton } from "@/ui/submit-button";
import { approveListingAction, rejectListingAction } from "./actions";

/** The decision a moderator makes on a listing: approve it, or turn it down. */
export function ReviewPanel({
  id,
  status,
}: {
  id: string;
  status: ListingStatus;
}) {
  const [approval, approve] = useActionState(approveListingAction, undefined);
  const [rejection, reject] = useActionState(rejectListingAction, undefined);
  const live = status === "active";

  return (
    <div className="grid gap-6">
      {!live && (
        <form action={approve}>
          <input type="hidden" name="id" value={id} />
          <SubmitButton variant="primary" className="w-full">
            Approve and publish
          </SubmitButton>
          {approval?.message && (
            <p role="alert" className="text-negative mt-2">
              {approval.message}
            </p>
          )}
        </form>
      )}
      <form action={reject} className="grid gap-3">
        <input type="hidden" name="id" value={id} />
        <fieldset className="grid gap-2">
          <legend className="mb-2 font-medium">
            {live ? "Take it down" : "Or reject it"}
          </legend>
          <label className="flex items-start gap-2.5">
            <input
              type="radio"
              name="kind"
              value="soft"
              defaultChecked={rejection?.values?.kind !== "permanent"}
              className="accent-primary mt-0.5 size-4"
            />
            <span>
              The seller can fix it
              <span className="text-small text-muted block">
                They edit the listing and send it in again.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2.5">
            <input
              type="radio"
              name="kind"
              value="permanent"
              defaultChecked={rejection?.values?.kind === "permanent"}
              className="accent-primary mt-0.5 size-4"
            />
            <span>
              It doesn&apos;t belong on Listora
              <span className="text-small text-muted block">
                The listing is closed for good.
              </span>
            </span>
          </label>
        </fieldset>
        <div className="grid gap-2">
          <label htmlFor="reason" className="font-medium">
            Reason
          </label>
          <textarea
            id="reason"
            name="reason"
            rows={3}
            defaultValue={rejection?.values?.reason}
            aria-invalid={rejection?.errors?.reason ? true : undefined}
            aria-describedby="reason-note"
            className="border-control bg-surface aria-invalid:border-negative w-full rounded-control border px-3 py-2"
          />
          <p
            id="reason-note"
            className={`text-small ${rejection?.errors?.reason ? "text-negative" : "text-muted"}`}
          >
            {rejection?.errors?.reason ??
              "The seller reads this, word for word."}
          </p>
        </div>
        {rejection?.message && (
          <p role="alert" className="text-negative">
            {rejection.message}
          </p>
        )}
        <SubmitButton variant="danger">
          {live ? "Take down" : "Reject"}
        </SubmitButton>
      </form>
    </div>
  );
}
