"use client";

import { useActionState, useState } from "react";
import { Field, SelectField } from "@/ui/field";
import { SubmitButton } from "@/ui/submit-button";
import { savePackageAction } from "./actions";

type Package = {
  id: string;
  name: string;
  kind: "listing" | "featured";
  priceCents: number;
  quantity: number;
  days: number;
  featureDays: number | null;
  categoryId: string | null;
  active: boolean;
};

/** Creates a package, or edits one when given. */
export function PackageForm({
  pkg,
  categories,
}: {
  pkg?: Package;
  categories: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(savePackageAction, undefined);
  const values = state?.values;
  const errors = state?.errors ?? {};
  const [kind, setKind] = useState(values?.kind ?? pkg?.kind ?? "listing");

  return (
    <form action={action} className="grid max-w-[520px] gap-5">
      {pkg && <input type="hidden" name="id" value={pkg.id} />}
      <Field
        label="Name"
        name="name"
        defaultValue={values?.name ?? pkg?.name}
        error={errors.name}
      />
      <SelectField
        label="What it gives"
        name="kind"
        value={kind}
        onChange={(event) => setKind(event.target.value as Package["kind"])}
        error={errors.kind}
      >
        <option value="listing">Listings to post</option>
        <option value="featured">Listings to feature</option>
      </SelectField>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field
          label="Price ($)"
          name="price"
          inputMode="decimal"
          defaultValue={
            values?.price ?? (pkg ? (pkg.priceCents / 100).toFixed(2) : "")
          }
          error={errors.price}
        />
        <Field
          label="How many"
          name="quantity"
          inputMode="numeric"
          defaultValue={values?.quantity ?? pkg?.quantity}
          error={errors.quantity}
        />
        <Field
          label="Good for (days)"
          name="days"
          inputMode="numeric"
          defaultValue={values?.days ?? pkg?.days ?? 30}
          error={errors.days}
        />
      </div>
      {kind === "featured" && (
        <Field
          label="Each listing stays on top for (days)"
          name="featureDays"
          inputMode="numeric"
          defaultValue={values?.featureDays ?? pkg?.featureDays ?? 7}
          error={errors.featureDays}
        />
      )}
      <SelectField
        label="Categories"
        name="categoryId"
        defaultValue={values?.categoryId ?? pkg?.categoryId ?? ""}
        hint="A package for one category covers everything under it."
        error={errors.categoryId}
      >
        <option value="">Every category</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </SelectField>
      <label className="flex items-center gap-2.5">
        <input
          type="checkbox"
          name="active"
          defaultChecked={
            values ? values.active === "on" : (pkg?.active ?? true)
          }
          className="accent-primary size-4"
        />
        On sale in the app
      </label>
      {state?.message && (
        <p role="alert" className="text-negative">
          {state.message}
        </p>
      )}
      <div>
        <SubmitButton variant="primary">
          {pkg ? "Save package" : "Add package"}
        </SubmitButton>
      </div>
    </form>
  );
}
