import "server-only";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { env } from "../env";
import { AppError } from "../errors";

// Everything that talks to S3. The bucket stays private: files reach people
// through our own routes, never through a public S3 address.

let client: S3Client | undefined;

function bucket() {
  if (!env.S3_BUCKET) {
    throw new AppError("conflict", "Photo storage isn't set up yet.");
  }
  client ??= new S3Client({});
  return { s3: client, Bucket: env.S3_BUCKET };
}

export async function putFile(key: string, body: Buffer, contentType: string) {
  const { s3, Bucket } = bucket();
  await s3.send(
    new PutObjectCommand({
      Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

/** The file as a stream, or null if there is no such file. */
export async function getFile(key: string) {
  const { s3, Bucket } = bucket();
  try {
    const file = await s3.send(new GetObjectCommand({ Bucket, Key: key }));
    return {
      body: file.Body!.transformToWebStream(),
      contentType: file.ContentType ?? "application/octet-stream",
      size: file.ContentLength,
    };
  } catch (error) {
    if (error instanceof NoSuchKey) return null;
    throw error;
  }
}

export async function deleteFiles(keys: string[]) {
  const { s3, Bucket } = bucket();
  // S3 takes up to a thousand keys per call.
  for (let start = 0; start < keys.length; start += 1000) {
    await s3.send(
      new DeleteObjectsCommand({
        Bucket,
        Delete: {
          Objects: keys.slice(start, start + 1000).map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );
  }
}
