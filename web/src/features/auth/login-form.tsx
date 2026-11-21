"use client";

import { useActionState } from "react";
import { Field } from "@/ui/field";
import { SubmitButton } from "@/ui/submit-button";
import { signInAction } from "./actions";

export function LoginForm() {
  const [state, action] = useActionState(signInAction, undefined);

  return (
    <form action={action} className="grid gap-4">
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        defaultValue={state?.values?.email}
        error={state?.errors?.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        error={state?.errors?.password}
      />
      {state?.message && (
        <p role="alert" className="text-negative">
          {state.message}
        </p>
      )}
      <SubmitButton variant="primary" className="h-[38px]">
        Sign in
      </SubmitButton>
    </form>
  );
}
