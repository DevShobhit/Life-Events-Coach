import { describe, expect, test } from "bun:test";
import { ApiError, errorMessages } from "./errors";

describe("API error contract", () => {
  test("maps every server error code to safe client copy", () => {
    for (const [code, message] of Object.entries(errorMessages)) {
      const error = new ApiError(code, "request-1", 500);
      expect(error.message).toBe(message);
      expect(error.message).not.toContain("request-1");
    }
  });
});
