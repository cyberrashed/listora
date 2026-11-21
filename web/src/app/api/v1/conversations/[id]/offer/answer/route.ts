import { answerInput, answerOffer } from "@/server/chat/chat";
import { parseBody, requireUser, route } from "@/server/http";

type Context = RouteContext<"/api/v1/conversations/[id]/offer/answer">;

export const POST = route(async (request, { params }: Context) => {
  const seller = await requireUser(request);
  const input = await parseBody(request, answerInput);
  return Response.json(await answerOffer(seller, (await params).id, input), {
    status: 201,
  });
});
