import "server-only";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { env } from "../env";
import { AppError } from "../errors";

const secret = new TextEncoder().encode(env.JWT_SECRET);

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export function randomToken() {
  return randomBytes(32).toString("base64url");
}

// Opaque tokens are stored hashed, so a leaked database does not hand out
// working sessions.
export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function randomCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function signAccessToken(userId: string) {
  return new SignJWT()
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifyAccessToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    if (payload.sub) return payload.sub;
  } catch {
    // Expired, malformed and forged tokens all get the same answer.
  }
  throw new AppError("unauthenticated", "Sign in to continue.");
}
