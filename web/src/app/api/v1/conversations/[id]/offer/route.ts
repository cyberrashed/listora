import { makeOffer, offerInput } from "@/server/chat/chat";
import { parseBody, requireUser, route } from "@/server/http";

type Context = RouteContext<"/api/v1/conversations/[id]/offer">;

export const POST = route(async (request, { params }: Context) => {
  const buyer = await requireUser(request);
  const input = await parseBody(request, offerInput);
  return Response.json(await makeOffer(buyer, (await params).id, input), {
    status: 201,
  });
});
