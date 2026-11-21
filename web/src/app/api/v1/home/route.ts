import { homeContent } from "@/server/content/content";
import { route } from "@/server/http";

export const GET = route(async () => Response.json(await homeContent()));
