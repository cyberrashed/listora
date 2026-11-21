"use client";

import Link from "next/link";
import { useActionState } from "react";
import { buttonClass } from "@/ui/button";
import { Field, SelectField } from "@/ui/field";
import { SubmitButton } from "@/ui/submit-button";
import { createStaffAction } from "./actions";

export function NewStaffForm({
  roles,
}: {
  roles: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(createStaffAction, undefined);

  return (
    <form action={action} className="grid max-w-[420px] gap-4">
      <Field
        label="Name"
        name="name"
        defaultValue={state?.values?.name}
        error={state?.errors?.name}
      />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="off"
        defaultValue={state?.values?.email}
        error={state?.errors?.email}
      />
      {/* A select ignores a new default after the form resets, so it is
          remounted to pick up the role that was chosen. */}
      <SelectField
        key={state?.values?.roleId}
        label="Role"
        name="roleId"
        defaultValue={state?.values?.roleId}
        error={state?.errors?.roleId}
      >
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </SelectField>
      <Field
        label="Temporary password"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters. Share it with them yourself; no email is sent."
        error={state?.errors?.password}
      />
      {state?.message && (
        <p role="alert" className="text-negative">
          {state.message}
        </p>
      )}
      <div className="flex gap-2">
        <SubmitButton variant="primary">Add to team</SubmitButton>
        <Link href="/team" className={buttonClass("quiet")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
