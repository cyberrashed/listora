import type { z } from "zod";
import { AppError } from "@/server/errors";

// What a server action hands back to its form: a message for the whole form,
// one message per field, or a note that the save went through.
export type FormState =
  | {
      message?: string;
      errors?: Record<string, string>;
      saved?: boolean;
      values?: Record<string, string>;
    }
  | undefined;

// React clears a form once its action has run. A refused form hands these
// back so the fields can be filled in again. Never pass a password field.
export function keep(formData: FormData, ...names: string[]) {
  return Object.fromEntries(
    names.map((name) => [name, String(formData.get(name) ?? "")]),
  );
}

export function invalid(error: z.ZodError): FormState {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    errors[issue.path.join(".")] ??= issue.message;
  }
  return { errors };
}

export function failed(error: unknown): FormState {
  if (!(error instanceof AppError)) throw error;
  return error.fields ? { errors: error.fields } : { message: error.message };
}
