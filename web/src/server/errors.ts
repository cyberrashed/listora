const statusByCode = {
  validation: 422,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  payment_required: 402,
} as const;

export type ErrorCode = keyof typeof statusByCode;

// An error the caller can act on. Anything else that is thrown is a bug and
// surfaces as a 500.
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }

  get status() {
    return statusByCode[this.code];
  }
}
