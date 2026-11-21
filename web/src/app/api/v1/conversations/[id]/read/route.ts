import { markConversationRead } from "@/server/chat/chat";
import { requireUser, route } from "@/server/http";

type Context = RouteContext<"/api/v1/conversations/[id]/read">;

export const POST = route(async (request, { params }: Context) => {
  const user = await requireUser(request);
  await markConversationRead(user, (await params).id);
  return new Response(null, { status: 204 });
});
