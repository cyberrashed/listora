import { connection } from "next/server";
import { listCategories } from "@/server/categories/categories";
import { route } from "@/server/http";

export const GET = route(async () => {
  await connection();
  return Response.json(await listCategories());
});
