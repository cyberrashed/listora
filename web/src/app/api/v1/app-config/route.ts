import { route } from "@/server/http";
import { appConfig } from "@/server/settings/settings";

export const GET = route(async () => Response.json(await appConfig()));
