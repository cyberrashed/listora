import { resetPassword } from "@/server/auth/customer-auth";
import { passwordReset } from "@/server/auth/schemas";
import { limitAttempts, parseBody, route } from "@/server/http";

export const POST = route(async (request) => {
  await limitAttempts(request, "password-reset");
  const input = await parseBody(request, passwordReset);
  await resetPassword(input);
  return new Response(null, { status: 204 });
});
