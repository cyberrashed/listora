import "server-only";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { authenticate } from "./auth/customer-auth";
import { AppError } from "./errors";
import { rateLimit } from "./rate-limit";

// The one place an error becomes a response. Route handlers throw.
function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return Response.json(
      { code: error.code, message: error.message, details: error.fields },
      { status: error.status },
    );
  }

  console.error(error);
  return Response.json(
    { code: "internal", message: "Something went wrong on our side." },
    { status: 500 },
  );
}

export function route<Context>(
  handler: (request: Request, context: Context) => Promise<Response>,
) {
  return async (request: Request, context: Context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      // Next signals "render this at request time" by throwing. That is not
      // a failure and has to reach the framework.
      unstable_rethrow(error);
      return errorResponse(error);
    }
  };
}

function validated<Schema extends z.ZodType>(
  schema: Schema,
  value: unknown,
): z.infer<Schema> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    fields[issue.path.join(".")] ??= issue.message;
  }
  throw new AppError("validation", "Check the highlighted fields.", fields);
}

export async function parseBody<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
) {
  const body: unknown = await request.json().catch(() => null);
  return validated(schema, body);
}

export function parseQuery<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
) {
  const { searchParams } = new URL(request.url);
  return validated(schema, Object.fromEntries(searchParams));
}

export async function requireUser(request: Request) {
  const [scheme, token] = (request.headers.get("authorization") ?? "").split(
    " ",
  );
  if (scheme !== "Bearer" || !token) {
    throw new AppError("unauthenticated", "Sign in to continue.");
  }
  return authenticate(token);
}

/** The signed-in customer, or null for a guest. A bad token is still refused. */
export async function optionalUser(request: Request) {
  return request.headers.has("authorization") ? requireUser(request) : null;
}

// Sign-in style endpoints: ten tries a minute from one address.
export function limitAttempts(request: Request, action: string) {
  const address =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  return rateLimit(`${action}:${address}`, 10, 60);
}
