import { z } from "zod";
import { listConversations } from "@/server/chat/chat";
import { parseQuery, requireUser, route } from "@/server/http";

const query = z.object({ role: z.enum(["buying", "selling"]) });

export const GET = route(async (request) => {
  const user = await requireUser(request);
  const { role } = parseQuery(request, query);
  return Response.json(await listConversations(user, role));
});
