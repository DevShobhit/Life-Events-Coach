import { ApiError, errorMessages } from "@/lib/api/errors";

export function getUserFacingError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return errorMessages.internal_error;
}

export function shouldQueueRoadmapAction(error: unknown): boolean {
  if (error instanceof ApiError) return error.status >= 500;
  return error instanceof TypeError;
}
