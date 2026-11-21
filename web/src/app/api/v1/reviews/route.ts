import { limitAttempts, parseBody, requireUser, route } from "@/server/http";
import { reviewInput, writeReview } from "@/server/reviews/reviews";

export const POST = route(async (request) => {
  const reviewer = await requireUser(request);
  await limitAttempts(request, "review");
  const input = await parseBody(request, reviewInput);
  return Response.json(await writeReview(reviewer, input), { status: 201 });
});
