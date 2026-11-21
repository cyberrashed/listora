"use client";

import { useActionState } from "react";
import { Field, SelectField } from "@/ui/field";
import { SubmitButton } from "@/ui/submit-button";
import { createCategoryAction } from "./actions";
import { type CategoryOption, indented } from "./shared";

export function NewCategoryForm({ parents }: { parents: CategoryOption[] }) {
  const [state, action] = useActionState(createCategoryAction, undefined);

  return (
    <form
      action={action}
      className="bg-raised mb-6 grid max-w-[1000px] items-start gap-3 rounded-card p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
    >
      <Field
        label="New category"
        name="name"
        placeholder="Name"
        defaultValue={state?.values?.name}
        error={state?.errors?.name}
      />
      <SelectField
        key={state?.values?.parentId}
        label="Under"
        name="parentId"
        defaultValue={state?.values?.parentId ?? ""}
        error={state?.errors?.parentId ?? state?.message}
      >
        <option value="">Top level</option>
        {parents.map((parent) => (
          <option key={parent.id} value={parent.id}>
            {indented(parent)}
          </option>
        ))}
      </SelectField>
      <SubmitButton variant="primary" className="h-[38px] sm:mt-7">
        Add category
      </SubmitButton>
    </form>
  );
}
