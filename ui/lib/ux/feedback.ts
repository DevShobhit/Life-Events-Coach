import { ApiError, errorMessages } from "@/lib/api/errors";

export function getUserFacingError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return errorMessages.internal_error;
}

export function isApiErrorCode(error: unknown, code: string): boolean {
  return error instanceof ApiError && error.code === code;
}

export function shouldQueueRoadmapAction(error: unknown): boolean {
  if (error instanceof ApiError) return error.status >= 500;
  return error instanceof TypeError;
}
