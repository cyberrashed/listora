import { requestPasswordReset } from "@/server/auth/customer-auth";
import { passwordResetRequest } from "@/server/auth/schemas";
import { limitAttempts, parseBody, route } from "@/server/http";

export const POST = route(async (request) => {
  await limitAttempts(request, "password-forgot");
  const { email } = await parseBody(request, passwordResetRequest);
  await requestPasswordReset(email);
  return new Response(null, { status: 204 });
});
