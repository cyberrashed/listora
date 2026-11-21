import { requireUser, route } from "@/server/http";
import { myCredits, myPayments } from "@/server/packages/packages";

export const GET = route(async (request) => {
  const user = await requireUser(request);
  const [credits, payments] = await Promise.all([
    myCredits(user),
    myPayments(user),
  ]);
  return Response.json({ credits, payments });
});
