"use client";

import { useActionState } from "react";
import { Field, SelectField } from "@/ui/field";
import { SubmitButton } from "@/ui/submit-button";
import { grantPackageAction } from "./actions";

/** Gives a customer a package without payment. */
export function GrantForm({
  packages,
}: {
  packages: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(grantPackageAction, undefined);
  const errors = state?.errors ?? {};

  return (
    <form action={action} className="grid gap-4">
      <SelectField
        label="Package"
        name="packageId"
        defaultValue={state?.values?.packageId}
        error={errors.packageId}
      >
        {packages.map((pkg) => (
          <option key={pkg.id} value={pkg.id}>
            {pkg.name}
          </option>
        ))}
      </SelectField>
      <Field
        label="Customer's email"
        name="email"
        type="email"
        defaultValue={state?.saved ? "" : state?.values?.email}
        error={errors.email}
      />
      {state?.message && (
        <p role="alert" className="text-negative">
          {state.message}
        </p>
      )}
      {state?.saved && (
        <p role="status" className="text-positive">
          Given. They get a notification in the app.
        </p>
      )}
      <div>
        <SubmitButton>Give package</SubmitButton>
      </div>
    </form>
  );
}
