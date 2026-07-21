import { describe, expect, test } from "bun:test";
import { askModeMessage, didAskSheetClose, isRetryableAskError } from "./ask-sheet";

describe("AskSheet reset policy", () => {
  test("resets only when the sheet transitions from open to closed", () => {
    expect(didAskSheetClose(true, false)).toBe(true);
    expect(didAskSheetClose(false, false)).toBe(false);
    expect(didAskSheetClose(false, true)).toBe(false);
    expect(didAskSheetClose(true, true)).toBe(false);
  });
});

describe("AskSheet response messaging", () => {
  test("gives refusal responses a recovery action message", () => {
    expect(askModeMessage("refusal")).toContain("rephrase");
    expect(askModeMessage("grounded")).toBeNull();
  });

  test("recognizes retryable Ask failures", () => {
    expect(isRetryableAskError({ status: 503 })).toBe(true);
    expect(isRetryableAskError({ status: 504 })).toBe(true);
    expect(isRetryableAskError({ status: 422 })).toBe(false);
  });
});
