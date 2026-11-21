import { limitAttempts, parseBody, requireUser, route } from "@/server/http";
import { fileReport, reportInput } from "@/server/reports/reports";

export const POST = route(async (request) => {
  const reporter = await requireUser(request);
  await limitAttempts(request, "report");
  await fileReport(reporter, await parseBody(request, reportInput));
  return new Response(null, { status: 204 });
});
