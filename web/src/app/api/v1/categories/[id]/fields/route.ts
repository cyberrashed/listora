import { fieldsForCategory } from "@/server/categories/custom-fields";
import { route } from "@/server/http";

type Context = RouteContext<"/api/v1/categories/[id]/fields">;

export const GET = route(async (_request, { params }: Context) => {
  return Response.json(await fieldsForCategory((await params).id));
});
