export const errorMessages = {
  bad_request: "That request needs a small correction. Please try again.",
  dependency_unavailable:
    "This content is temporarily unavailable. Please retry.",
  forbidden: "This action is not available for the current session.",
  gateway_timeout:
    "The approved sources took too long to respond. Please retry.",
  http_error: "The service could not complete that request. Please retry.",
  internal_error: "Something went wrong on our side. Please retry.",
  not_found: "That content is no longer available. Please refresh and retry.",
  validation_error: "Some details need attention before we can continue.",
} as const;

export type ApiErrorCode = keyof typeof errorMessages;

export class ApiError extends Error {
  readonly code: string;
  readonly requestId: string | null;
  readonly status: number;

  constructor(code: string, requestId: string | null, status: number) {
    super(errorMessages[code as ApiErrorCode] ?? errorMessages.internal_error);
    this.name = "ApiError";
    this.code = code;
    this.requestId = requestId;
    this.status = status;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
