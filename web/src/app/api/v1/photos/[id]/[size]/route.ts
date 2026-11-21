import { route } from "@/server/http";
import { readPhoto } from "@/server/media/photos";

type Context = RouteContext<"/api/v1/photos/[id]/[size]">;

// A photo never changes under its address: a new photo gets a new id. So
// phones and browsers can keep it for good.
export const GET = route(async (_request, { params }: Context) => {
  const { id, size } = await params;
  const photo = await readPhoto(id, size);
  if (!photo) return new Response("Not found", { status: 404 });

  return new Response(photo.body, {
    headers: {
      "content-type": photo.contentType,
      ...(photo.size !== undefined && { "content-length": String(photo.size) }),
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
});
