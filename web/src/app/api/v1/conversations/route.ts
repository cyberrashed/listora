import { z } from "zod";
import { startConversation } from "@/server/chat/chat";
import { parseBody, requireUser, route } from "@/server/http";

const input = z.object({ listingId: z.string() });

export const POST = route(async (request) => {
  const buyer = await requireUser(request);
  const { listingId } = await parseBody(request, input);
  return Response.json(await startConversation(buyer, listingId));
});
