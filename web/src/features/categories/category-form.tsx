"use client";

import Link from "next/link";
import { useActionState } from "react";
import { buttonClass } from "@/ui/button";
import { Field, SelectField } from "@/ui/field";
import { SubmitButton } from "@/ui/submit-button";
import { updateCategoryAction } from "./actions";
import { type CategoryOption, indented } from "./shared";

export function CategoryForm({
  category,
  parents,
}: {
  category: {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    active: boolean;
  };
  parents: CategoryOption[];
}) {
  const [state, action] = useActionState(updateCategoryAction, undefined);
  const parentId = state?.values?.parentId ?? category.parentId ?? "";

  return (
    <form action={action} className="grid max-w-[420px] gap-4">
      <input type="hidden" name="id" value={category.id} />
      <Field
        label="Name"
        name="name"
        defaultValue={state?.values?.name ?? category.name}
        error={state?.errors?.name}
      />
      <Field
        label="Slug"
        name="slug"
        defaultValue={state?.values?.slug ?? category.slug}
        hint="Used in links. Changing it breaks links people have already shared."
        error={state?.errors?.slug}
      />
      <SelectField
        key={parentId}
        label="Under"
        name="parentId"
        defaultValue={parentId}
        hint="Moving a category takes its subcategories along."
        error={state?.errors?.parentId}
      >
        <option value="">Top level</option>
        {parents.map((parent) => (
          <option key={parent.id} value={parent.id}>
            {indented(parent)}
          </option>
        ))}
      </SelectField>
      <label className="flex items-start gap-2.5">
        <input
          type="checkbox"
          name="active"
          defaultChecked={category.active}
          className="accent-primary mt-0.5 size-4"
        />
        <span>
          Shown to customers
          <span className="text-small text-muted block">
            Hiding a category hides everything under it too.
          </span>
        </span>
      </label>
      {state?.message && (
        <p role="alert" className="text-negative">
          {state.message}
        </p>
      )}
      <div className="flex gap-2">
        <SubmitButton variant="primary">Save</SubmitButton>
        <Link href="/categories" className={buttonClass("quiet")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
