import { parseBody, requireUser, route } from "@/server/http";
import {
  myVerification,
  requestVerification,
  verificationInput,
} from "@/server/verification/verification";

export const GET = route(async (request) => {
  return Response.json(await myVerification(await requireUser(request)));
});

export const POST = route(async (request) => {
  const user = await requireUser(request);
  const input = await parseBody(request, verificationInput);
  return Response.json(await requestVerification(user, input), {
    status: 201,
  });
});
