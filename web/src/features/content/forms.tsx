"use client";

import { useActionState, useState } from "react";
import { Field, SelectField } from "@/ui/field";
import { SubmitButton } from "@/ui/submit-button";
import type { FormState } from "../form-state";
import {
  saveBannerAction,
  savePageAction,
  savePostAction,
  saveSettingsAction,
  sendAnnouncementAction,
} from "./actions";

const area =
  "w-full rounded-control border border-control bg-surface px-3 py-2 placeholder:text-muted aria-invalid:border-negative";

/** A multi-line field, laid out like the single-line ones. */
function TextArea({
  label,
  name,
  rows = 6,
  defaultValue,
  error,
  hint,
}: {
  label: string;
  name: string;
  rows?: number;
  defaultValue?: string;
  error?: string;
  hint?: string;
}) {
  return (
    <div className="grid gap-2">
      <label htmlFor={name} className="font-medium">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${name}-note` : undefined}
        className={area}
      />
      {(error || hint) && (
        <p
          id={`${name}-note`}
          className={`text-small ${error ? "text-negative" : "text-muted"}`}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

function Check({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-2.5">
      {/* React resets a form after its action; a new key makes the box
          start again from the value that came back. */}
      <input
        key={String(defaultChecked)}
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="accent-primary size-4"
      />
      {label}
    </label>
  );
}

function Outcome({ state }: { state: FormState }) {
  if (!state?.message) return null;
  return (
    <p
      role={state.saved ? "status" : "alert"}
      className={state.saved ? "text-positive" : "text-negative"}
    >
      {state.message}
    </p>
  );
}

// What was typed if the form came back refused, otherwise the saved value.
function pick(
  state: FormState,
  saved: Record<string, string | boolean | null | undefined> | undefined,
  name: string,
) {
  return state?.values?.[name] ?? (saved?.[name] as string | undefined);
}

function ticked(
  state: FormState,
  saved: Record<string, unknown> | undefined,
  name: string,
  fallback: boolean,
) {
  return state?.values
    ? state.values[name] === "on"
    : ((saved?.[name] as boolean) ?? fallback);
}

export function BannerForm({
  banner,
  categories,
}: {
  banner?: {
    id: string;
    title: string;
    body: string;
    link: string;
    target: string | null;
    active: boolean;
  };
  categories: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(saveBannerAction, undefined);
  const errors = state?.errors ?? {};
  const [link, setLink] = useState(pick(state, banner, "link") ?? "none");

  return (
    <form action={action} className="grid max-w-[520px] gap-5">
      {banner && <input type="hidden" name="id" value={banner.id} />}
      <Field
        label="Title"
        name="title"
        defaultValue={pick(state, banner, "title")}
        error={errors.title}
      />
      <TextArea
        label="Line under it"
        name="body"
        rows={2}
        defaultValue={pick(state, banner, "body")}
        error={errors.body}
        hint="One short sentence."
      />
      <SelectField
        label="Tapping it opens"
        name="link"
        value={link}
        onChange={(event) => setLink(event.target.value)}
        error={errors.link}
      >
        <option value="none">Nothing</option>
        <option value="category">A category</option>
        <option value="search">A search</option>
        <option value="post">The form to post a listing</option>
      </SelectField>
      {link === "category" && (
        <SelectField
          label="Category"
          name="target"
          defaultValue={pick(state, banner, "target")}
          error={errors.target}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectField>
      )}
      {link === "search" && (
        <Field
          label="Search for"
          name="target"
          defaultValue={pick(state, banner, "target")}
          error={errors.target}
        />
      )}
      <Check
        name="active"
        label="Show it in the app"
        defaultChecked={ticked(state, banner, "active", true)}
      />
      <Outcome state={state} />
      <div>
        <SubmitButton variant="primary">
          {banner ? "Save banner" : "Add banner"}
        </SubmitButton>
      </div>
    </form>
  );
}

export function PageForm({
  page,
  kind,
}: {
  page?: {
    id: string;
    kind: string;
    title: string;
    slug: string;
    body: string;
    published: boolean;
  };
  kind: "faq" | "page";
}) {
  const [state, action] = useActionState(savePageAction, undefined);
  const errors = state?.errors ?? {};
  const faq = (page?.kind ?? kind) === "faq";

  return (
    <form action={action} className="grid max-w-[640px] gap-5">
      {page && <input type="hidden" name="id" value={page.id} />}
      <input type="hidden" name="kind" value={page?.kind ?? kind} />
      <Field
        label={faq ? "Question" : "Title"}
        name="title"
        defaultValue={pick(state, page, "title")}
        error={errors.title}
      />
      {!faq && (
        <Field
          label="Address"
          name="slug"
          defaultValue={pick(state, page, "slug")}
          error={errors.slug}
          hint="Leave empty to make one from the title."
        />
      )}
      <TextArea
        label={faq ? "Answer" : "Text"}
        name="body"
        rows={faq ? 5 : 14}
        defaultValue={pick(state, page, "body")}
        error={errors.body}
        hint="A blank line starts a new paragraph."
      />
      <Check
        name="published"
        label="Published in the app"
        defaultChecked={ticked(state, page, "published", true)}
      />
      <Outcome state={state} />
      <div>
        <SubmitButton variant="primary">
          {page ? "Save" : faq ? "Add question" : "Add page"}
        </SubmitButton>
      </div>
    </form>
  );
}

export function PostForm({
  post,
}: {
  post?: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    body: string;
    published: boolean;
  };
}) {
  const [state, action] = useActionState(savePostAction, undefined);
  const errors = state?.errors ?? {};

  return (
    <form action={action} className="grid max-w-[720px] gap-5">
      {post && <input type="hidden" name="id" value={post.id} />}
      <Field
        label="Title"
        name="title"
        defaultValue={pick(state, post, "title")}
        error={errors.title}
      />
      <Field
        label="Address"
        name="slug"
        defaultValue={pick(state, post, "slug")}
        error={errors.slug}
        hint="Leave empty to make one from the title."
      />
      <TextArea
        label="Summary"
        name="excerpt"
        rows={2}
        defaultValue={pick(state, post, "excerpt")}
        error={errors.excerpt}
        hint="Shown in the list of posts."
      />
      <TextArea
        label="Post"
        name="body"
        rows={18}
        defaultValue={pick(state, post, "body")}
        error={errors.body}
        hint="A blank line starts a new paragraph."
      />
      <Check
        name="published"
        label="Published"
        defaultChecked={ticked(state, post, "published", false)}
      />
      <Outcome state={state} />
      <div>
        <SubmitButton variant="primary">
          {post ? "Save post" : "Add post"}
        </SubmitButton>
      </div>
    </form>
  );
}

export function AnnouncementForm() {
  const [state, action] = useActionState(sendAnnouncementAction, undefined);
  const errors = state?.errors ?? {};

  return (
    <form action={action} className="grid gap-4">
      <Field
        label="Title"
        name="title"
        defaultValue={state?.saved ? "" : state?.values?.title}
        error={errors.title}
      />
      <TextArea
        label="Message"
        name="body"
        rows={3}
        defaultValue={state?.saved ? "" : state?.values?.body}
        error={errors.body}
      />
      <Field
        label="Only to (optional)"
        name="email"
        type="email"
        defaultValue={state?.saved ? "" : state?.values?.email}
        error={errors.email}
        hint="Leave empty to send it to every customer."
      />
      <Outcome state={state} />
      <div>
        <SubmitButton variant="primary">Send</SubmitButton>
      </div>
    </form>
  );
}

export function SettingsForm({
  settings,
}: {
  settings: {
    freeListingsPerMonth: number;
    maintenance: boolean;
    maintenanceMessage: string;
    minAppVersion: string;
    supportEmail: string;
  };
}) {
  const [state, action] = useActionState(saveSettingsAction, undefined);
  const errors = state?.errors ?? {};
  const value = (name: keyof typeof settings) =>
    state?.values?.[name] ?? String(settings[name]);

  return (
    <form action={action} className="grid max-w-[560px] gap-8">
      <fieldset className="grid gap-5">
        <legend className="text-section mb-3 font-medium">Selling</legend>
        <Field
          label="Free listings a month"
          name="freeListingsPerMonth"
          inputMode="numeric"
          defaultValue={value("freeListingsPerMonth")}
          error={errors.freeListingsPerMonth}
          hint="Each account's allowance before a package is needed. A change counts from the next month an account posts in."
        />
      </fieldset>
      <fieldset className="grid gap-5">
        <legend className="text-section mb-3 font-medium">The app</legend>
        <Check
          name="maintenance"
          label="Maintenance mode: the app shows a notice instead of the marketplace"
          defaultChecked={
            state?.values
              ? state.values.maintenance === "on"
              : settings.maintenance
          }
        />
        <TextArea
          label="Maintenance notice"
          name="maintenanceMessage"
          rows={2}
          defaultValue={value("maintenanceMessage")}
          error={errors.maintenanceMessage}
        />
        <Field
          label="Oldest app version allowed"
          name="minAppVersion"
          defaultValue={value("minAppVersion")}
          error={errors.minAppVersion}
          hint="Anyone on an older version is asked to update before going on."
        />
        <Field
          label="Support email"
          name="supportEmail"
          type="email"
          defaultValue={value("supportEmail")}
          error={errors.supportEmail}
          hint="Shown on the app's help screen."
        />
      </fieldset>
      {state?.saved && (
        <p role="status" className="text-positive">
          Saved. The app picks it up the next time it opens.
        </p>
      )}
      <Outcome state={state?.saved ? undefined : state} />
      <div>
        <SubmitButton variant="primary">Save settings</SubmitButton>
      </div>
    </form>
  );
}
