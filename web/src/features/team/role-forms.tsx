"use client";

import { useActionState } from "react";
import { type Permission, permissions } from "@/server/staff/permissions";
import { Field } from "@/ui/field";
import { SubmitButton } from "@/ui/submit-button";
import { createRoleAction, updateRoleAction } from "./actions";

function PermissionBoxes({ held = [] }: { held?: readonly Permission[] }) {
  return (
    <fieldset className="grid gap-2.5">
      <legend className="sr-only">Permissions</legend>
      {Object.entries(permissions).map(([key, label]) => (
        <label key={key} className="flex items-center gap-2.5">
          <input
            type="checkbox"
            name="permissions"
            value={key}
            defaultChecked={held.includes(key as Permission)}
            className="accent-primary size-4"
          />
          {label}
        </label>
      ))}
    </fieldset>
  );
}

function Footer({
  label,
  message,
  saved,
}: {
  label: string;
  message?: string;
  saved?: boolean;
}) {
  return (
    <div className="mt-4 flex items-center justify-end gap-3">
      {message && (
        <p role="alert" className="text-negative">
          {message}
        </p>
      )}
      {saved && (
        <p role="status" className="text-muted">
          Saved
        </p>
      )}
      <SubmitButton>{label}</SubmitButton>
    </div>
  );
}

export function RolePermissionsForm({
  role,
}: {
  role: { id: string; permissions: readonly Permission[] };
}) {
  const [state, action] = useActionState(updateRoleAction, undefined);

  return (
    <form action={action}>
      <input type="hidden" name="id" value={role.id} />
      <PermissionBoxes held={role.permissions} />
      <Footer label="Save" message={state?.message} saved={state?.saved} />
    </form>
  );
}

export function NewRoleForm() {
  const [state, action] = useActionState(createRoleAction, undefined);

  return (
    <form action={action} className="grid gap-4">
      <Field
        label="Role name"
        name="name"
        defaultValue={state?.values?.name}
        error={state?.errors?.name}
      />
      <PermissionBoxes />
      <Footer label="Create role" message={state?.message} />
    </form>
  );
}
