import { login } from "@/server/auth/customer-auth";
import { credentials } from "@/server/auth/schemas";
import { limitAttempts, parseBody, route } from "@/server/http";

export const POST = route(async (request) => {
  await limitAttempts(request, "login");
  const input = await parseBody(request, credentials);
  return Response.json(await login(input));
});
