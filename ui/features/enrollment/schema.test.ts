import { describe, expect, test } from "bun:test";
import { enrollmentSchema } from "./schema";

describe("enrollment schema", () => {
  test("trims a required stage", () => {
    expect(
      enrollmentSchema.parse({
        stage: "  settling in  ",
        context: { origin_country: " India " },
      }),
    ).toEqual({
      stage: "settling in",
      context: { origin_country: " India " },
    });
    expect(enrollmentSchema.safeParse({ stage: "   " }).success).toBe(false);
  });

  test("allows optional configured context fields to be empty", () => {
    expect(enrollmentSchema.parse({ stage: "arrived", context: {} })).toEqual({
      stage: "arrived",
      context: {},
    });
  });
});
