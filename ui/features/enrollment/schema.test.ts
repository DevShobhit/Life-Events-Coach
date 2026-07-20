import { describe, expect, test } from "bun:test";
import { enrollmentSchema } from "./schema";

describe("enrollment schema", () => {
  test("trims a required stage", () => {
    expect(enrollmentSchema.parse({ stage: "  settling in  " })).toEqual({
      stage: "settling in",
    });
    expect(enrollmentSchema.safeParse({ stage: "   " }).success).toBe(false);
  });
});
