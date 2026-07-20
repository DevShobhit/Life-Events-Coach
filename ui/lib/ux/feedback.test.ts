import { describe, expect, test } from "bun:test";

import { ApiError } from "@/lib/api/errors";
import {
  getUserFacingError,
  shouldQueueRoadmapAction,
} from "@/lib/ux/feedback";

describe("getUserFacingError", () => {
  test("preserves the configured message for API errors", () => {
    expect(
      getUserFacingError(new ApiError("dependency_unavailable", null, 503)),
    ).toBe("This content is temporarily unavailable. Please retry.");
  });

  test("hides raw network errors", () => {
    expect(
      getUserFacingError(new Error("Failed to fetch http://localhost:8000")),
    ).toBe("Something went wrong on our side. Please retry.");
  });
});

describe("shouldQueueRoadmapAction", () => {
  test("queues network and transient server failures", () => {
    expect(shouldQueueRoadmapAction(new TypeError("Failed to fetch"))).toBe(
      true,
    );
    expect(
      shouldQueueRoadmapAction(
        new ApiError("dependency_unavailable", null, 503),
      ),
    ).toBe(true);
  });

  test("does not queue rejected or malformed actions", () => {
    expect(shouldQueueRoadmapAction(new ApiError("forbidden", null, 403))).toBe(
      false,
    );
    expect(
      shouldQueueRoadmapAction(new ApiError("validation_error", null, 422)),
    ).toBe(false);
    expect(shouldQueueRoadmapAction(new Error("Invalid response body"))).toBe(
      false,
    );
  });
});
