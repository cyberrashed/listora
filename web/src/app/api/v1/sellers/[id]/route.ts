import { optionalUser, route } from "@/server/http";
import { getSellerProfile } from "@/server/sellers/sellers";

type Context = RouteContext<"/api/v1/sellers/[id]">;

export const GET = route(async (request, { params }: Context) => {
  const viewer = await optionalUser(request);
  return Response.json(await getSellerProfile(viewer, (await params).id));
});
