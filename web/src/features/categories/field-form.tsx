"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { buttonClass } from "@/ui/button";
import { Field, SelectField } from "@/ui/field";
import { SubmitButton } from "@/ui/submit-button";
import { saveFieldAction } from "./actions";
import { type CategoryOption, fieldTypeLabels } from "./shared";

type FieldType = keyof typeof fieldTypeLabels;

export type FieldValues = {
  id?: string;
  label: string;
  type: FieldType;
  options: string[];
  unit: string | null;
  required: boolean;
  filterable: boolean;
  categoryIds: string[];
};

const blank: FieldValues = {
  label: "",
  type: "text",
  options: [],
  unit: null,
  required: false,
  filterable: false,
  categoryIds: [],
};

function Check({
  name,
  value,
  checked,
  children,
}: {
  name: string;
  value?: string;
  checked: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-2.5">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={checked}
        className="accent-primary mt-0.5 size-4 flex-none"
      />
      <span>{children}</span>
    </label>
  );
}

export function FieldForm({
  field = blank,
  categories,
}: {
  field?: FieldValues;
  categories: CategoryOption[];
}) {
  const [state, action] = useActionState(saveFieldAction, undefined);
  // A refused save hands the typed values back; they win over the saved ones.
  const sent = state?.values;
  const [type, setType] = useState<FieldType>(field.type);
  const attached = sent ? sent.categoryIds.split(",") : field.categoryIds;
  const isChoice = type === "select" || type === "multiselect";

  return (
    <form
      action={action}
      className="grid max-w-[1000px] gap-10 md:grid-cols-[minmax(0,420px)_minmax(0,1fr)]"
    >
      {field.id && <input type="hidden" name="id" value={field.id} />}
      <div className="grid content-start gap-4">
        <Field
          label="Label"
          name="label"
          placeholder="Mileage"
          defaultValue={sent?.label ?? field.label}
          error={state?.errors?.label}
        />
        <SelectField
          label="Answer"
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value as FieldType)}
          error={state?.errors?.type}
        >
          {Object.entries(fieldTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        {isChoice && (
          <div className="grid gap-2">
            <label htmlFor="options" className="font-medium">
              Choices
            </label>
            <textarea
              id="options"
              name="options"
              rows={5}
              defaultValue={sent?.options ?? field.options.join("\n")}
              aria-invalid={state?.errors?.options ? true : undefined}
              aria-describedby="options-note"
              className="border-control bg-surface aria-invalid:border-negative w-full rounded-control border px-3 py-2"
            />
            <p
              id="options-note"
              className={`text-small ${state?.errors?.options ? "text-negative" : "text-muted"}`}
            >
              {state?.errors?.options ?? "One per line."}
            </p>
          </div>
        )}
        {type === "number" && (
          <Field
            label="Unit (optional)"
            name="unit"
            placeholder="mi"
            defaultValue={sent?.unit ?? field.unit ?? ""}
            hint="Shown after the number, like “42,000 mi”."
            error={state?.errors?.unit}
          />
        )}
        <Check
          name="required"
          checked={sent ? sent.required === "on" : field.required}
        >
          Sellers must fill this in
        </Check>
        <Check
          name="filterable"
          checked={sent ? sent.filterable === "on" : field.filterable}
        >
          Buyers can filter by it
        </Check>
        {state?.message && (
          <p role="alert" className="text-negative">
            {state.message}
          </p>
        )}
        <div className="flex gap-2">
          <SubmitButton variant="primary">
            {field.id ? "Save" : "Create field"}
          </SubmitButton>
          <Link href="/categories/fields" className={buttonClass("quiet")}>
            Cancel
          </Link>
        </div>
      </div>
      <fieldset>
        <legend className="text-section font-medium">Categories</legend>
        <p className="text-muted mt-1 mb-4">
          Ticking a category covers everything under it, so tick the highest
          level that fits.
        </p>
        <div className="bg-raised grid gap-2.5 rounded-card p-4">
          {categories.map((category) => (
            <div key={category.id} style={{ paddingLeft: category.depth * 24 }}>
              <Check
                name="categoryIds"
                value={category.id}
                checked={attached.includes(category.id)}
              >
                {category.name}
              </Check>
            </div>
          ))}
        </div>
      </fieldset>
    </form>
  );
}
