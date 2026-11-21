import "server-only";
import { Types } from "mongoose";
import sharp from "sharp";
import { connectDb, isObjectId } from "../db";
import { AppError } from "../errors";
import type { UserDoc } from "../users/user.model";
import { Photo } from "./photo.model";
import { deleteFiles, getFile, putFile } from "./storage";

export const MAX_PHOTOS = 10;
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

// Two sizes of each photo: one for lists and cards, one for the gallery.
const sizes = {
  thumb: { edge: 640, quality: 72 },
  full: { edge: 1600, quality: 80 },
} as const;
export type PhotoSize = keyof typeof sizes;

const fileKey = (id: string, size: PhotoSize) => `photos/${id}/${size}.webp`;

/** Where the app and the dashboard load a photo from. */
export const photoUrl = (id: unknown, size: PhotoSize) =>
  `/api/v1/photos/${String(id)}/${size}`;

export const toPhotoDto = (id: unknown) => ({
  id: String(id),
  url: photoUrl(id, "full"),
  thumbUrl: photoUrl(id, "thumb"),
});

function resized(bytes: Buffer, size: PhotoSize) {
  const { edge, quality } = sizes[size];
  // Turned the way the camera held it. Sharp drops the rest of the
  // metadata, including where the photo was taken.
  return sharp(bytes)
    .rotate()
    .resize(edge, edge, { fit: "inside", withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();
}

/** Takes a photo from a seller, before the listing it belongs to exists. */
export async function uploadPhoto(owner: UserDoc, bytes: Buffer) {
  if (bytes.length === 0) {
    throw new AppError("validation", "That photo is empty.");
  }
  if (bytes.length > MAX_PHOTO_BYTES) {
    throw new AppError(
      "validation",
      "That photo is too big. Use one under 15 MB.",
    );
  }

  let files: [Buffer, Buffer];
  try {
    files = await Promise.all([
      resized(bytes, "thumb"),
      resized(bytes, "full"),
    ]);
  } catch {
    throw new AppError(
      "validation",
      "That file isn't a photo we can use. Try a JPEG or a PNG.",
    );
  }

  await connectDb();
  const photo = new Photo({ ownerId: owner._id });
  await Promise.all([
    putFile(fileKey(photo.id as string, "thumb"), files[0], "image/webp"),
    putFile(fileKey(photo.id as string, "full"), files[1], "image/webp"),
  ]);
  await photo.save();
  return toPhotoDto(photo._id);
}

/**
 * The photos a seller chose for a listing, in their order. Each must be
 * theirs, and either still unclaimed or already on this listing.
 */
export async function checkPhotos(
  owner: UserDoc,
  ids: string[],
  listingId?: Types.ObjectId,
) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  const owned = await Photo.countDocuments({
    _id: { $in: unique.filter(isObjectId) },
    ownerId: owner._id,
    listingId: { $in: [null, ...(listingId ? [listingId] : [])] },
  });
  if (owned !== unique.length) {
    throw new AppError("validation", "Some photos didn't upload.", {
      photoIds: "Some photos didn't upload. Remove them and add them again.",
    });
  }
  return unique.map((id) => new Types.ObjectId(id));
}

export async function attachPhotos(
  listingId: Types.ObjectId,
  ids: Types.ObjectId[],
) {
  await Photo.updateMany({ _id: { $in: ids } }, { listingId });
}

export async function deletePhotos(ids: Types.ObjectId[]) {
  if (ids.length === 0) return;
  await deleteFiles(
    ids.flatMap((id) =>
      (Object.keys(sizes) as PhotoSize[]).map((size) =>
        fileKey(String(id), size),
      ),
    ),
  );
  await Photo.deleteMany({ _id: { $in: ids } });
}

/** Clears photos that were uploaded but never posted with a listing. */
export async function removeUnusedPhotos(uploadedBefore: Date) {
  const unused = await Photo.find(
    { listingId: null, createdAt: { $lte: uploadedBefore } },
    { _id: 1 },
  ).lean();
  await deletePhotos(unused.map((photo) => photo._id));
  return unused.length;
}

/** One size of a photo, for the route that serves it. */
export async function readPhoto(id: string, size: string) {
  if (!isObjectId(id) || !(size in sizes)) return null;
  return getFile(fileKey(id, size as PhotoSize));
}
