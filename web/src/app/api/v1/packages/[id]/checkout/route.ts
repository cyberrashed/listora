import { requireUser, route } from "@/server/http";
import { startCheckout } from "@/server/packages/checkout";

type Context = RouteContext<"/api/v1/packages/[id]/checkout">;

export const POST = route(async (request, { params }: Context) => {
  const user = await requireUser(request);
  return Response.json(await startCheckout(user, (await params).id));
});
