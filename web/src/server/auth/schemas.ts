import { z } from "zod";

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."));

export const newPassword = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Use 128 characters or fewer.");

export const personName = z
  .string()
  .trim()
  .min(2, "Enter a name.")
  .max(80, "Use 80 characters or fewer.");

export const credentials = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const registration = z.object({
  name: personName,
  email,
  password: newPassword,
});

export const passwordResetRequest = z.object({ email });

export const passwordReset = z.object({
  email,
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
  password: newPassword,
});

export const refreshRequest = z.object({ refreshToken: z.string().min(1) });

export type Credentials = z.infer<typeof credentials>;
export type Registration = z.infer<typeof registration>;
export type PasswordReset = z.infer<typeof passwordReset>;
