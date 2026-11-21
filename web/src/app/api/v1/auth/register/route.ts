import { register } from "@/server/auth/customer-auth";
import { registration } from "@/server/auth/schemas";
import { limitAttempts, parseBody, route } from "@/server/http";

export const POST = route(async (request) => {
  await limitAttempts(request, "register");
  const input = await parseBody(request, registration);
  return Response.json(await register(input), { status: 201 });
});
