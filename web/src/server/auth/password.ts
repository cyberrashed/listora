import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// OWASP's scrypt setting for N = 2^15. It needs about 34 MB, just over
// Node's default limit.
const params = { N: 2 ** 15, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 64;

function derive(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, params, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `${salt.toString("base64")}:${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, key] = stored
    .split(":")
    .map((part) => Buffer.from(part, "base64"));
  return timingSafeEqual(await derive(password, salt), key);
}
