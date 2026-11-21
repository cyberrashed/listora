import { listMessages, messageInput, sendMessage } from "@/server/chat/chat";
import { parseBody, requireUser, route } from "@/server/http";

type Context = RouteContext<"/api/v1/conversations/[id]/messages">;

export const GET = route(async (request, { params }: Context) => {
  const user = await requireUser(request);
  const after = new URL(request.url).searchParams.get("after") ?? undefined;
  return Response.json(await listMessages(user, (await params).id, after));
});

export const POST = route(async (request, { params }: Context) => {
  const user = await requireUser(request);
  const input = await parseBody(request, messageInput);
  return Response.json(await sendMessage(user, (await params).id, input), {
    status: 201,
  });
});
