import { route } from "@/server/http";
import { listPackagesForSale } from "@/server/packages/packages";

export const GET = route(async () => {
  return Response.json(await listPackagesForSale());
});
