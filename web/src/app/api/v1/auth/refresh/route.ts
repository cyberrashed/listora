import { refresh } from "@/server/auth/customer-auth";
import { refreshRequest } from "@/server/auth/schemas";
import { parseBody, route } from "@/server/http";

export const POST = route(async (request) => {
  const { refreshToken } = await parseBody(request, refreshRequest);
  return Response.json(await refresh(refreshToken));
});
