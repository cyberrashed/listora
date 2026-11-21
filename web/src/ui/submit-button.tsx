"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./button";

export function SubmitButton(props: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending} {...props} />;
}
