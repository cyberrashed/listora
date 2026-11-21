import { AppError } from "@/server/errors";
import { requireUser, route } from "@/server/http";
import { MAX_PHOTO_BYTES, uploadPhoto } from "@/server/media/photos";

// The body is the photo itself, sent as image/jpeg, image/png or image/webp.
export const POST = route(async (request) => {
  const owner = await requireUser(request);
  // Refused before reading, when the phone says up front it's too big.
  if (Number(request.headers.get("content-length")) > MAX_PHOTO_BYTES) {
    throw new AppError(
      "validation",
      "That photo is too big. Use one under 15 MB.",
    );
  }
  const bytes = Buffer.from(await request.arrayBuffer());
  return Response.json(await uploadPhoto(owner, bytes), { status: 201 });
});
