// Inspect error messages only to select a fixed code. Never emit raw errors,
// SQL bindings, request URLs, headers, bodies or Better Auth logger arguments.
export class AuthConfigurationError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "AuthConfigurationError";
  }
}

export function failureCode(error: unknown): string {
  if (error instanceof AuthConfigurationError) return error.code;
  const messages: string[] = [];
  let cause = error;
  for (let depth = 0; depth < 5 && cause instanceof Error; depth++) {
    messages.push(cause.message);
    cause = cause.cause;
  }
  const message = messages.join(" ");
  if (/no such table/i.test(message)) return "DB_MIGRATIONS_REQUIRED";
  if (/no such column|schema mismatch|missing columns/i.test(message))
    return "DB_SCHEMA_MISMATCH";
  if (/D1_ERROR|SQLITE_ERROR/i.test(message)) return "DB_OPERATION_FAILED";
  return "UNEXPECTED_SERVER_ERROR";
}

export function reportFailure(error: unknown, requestId: string) {
  console.error(
    JSON.stringify({
      event: "request.failed",
      code: failureCode(error),
      requestId,
    }),
  );
}
