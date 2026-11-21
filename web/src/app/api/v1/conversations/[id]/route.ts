import { getConversation } from "@/server/chat/chat";
import { requireUser, route } from "@/server/http";

type Context = RouteContext<"/api/v1/conversations/[id]">;

export const GET = route(async (request, { params }: Context) => {
  const user = await requireUser(request);
  return Response.json(await getConversation(user, (await params).id));
});
