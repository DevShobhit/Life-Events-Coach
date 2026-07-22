import { describe, expect, test } from "bun:test";
import { askSchema } from "./schema";

describe("Ask schema", () => {
  test("enforces trimmed 1–500 character questions", () => {
    expect(askSchema.parse({ question: "  What matters next?  " })).toEqual({
      question: "What matters next?",
    });
    expect(askSchema.safeParse({ question: "" }).success).toBe(false);
    expect(askSchema.safeParse({ question: "x".repeat(501) }).success).toBe(
      false,
    );
  });
});
