import { describe, expect, test } from "bun:test";
import type { PhaseModule } from "@/lib/api/types";
import { createEnrollmentSchema, enrollmentSchema } from "./schema";

const phase: PhaseModule = {
  schema_version: "1",
  phase_id: "relocation",
  onboarding_fields: ["origin_country", "relocation_stage"],
  onboarding_field_metadata: [
    { key: "origin_country", label: "Origin", required: true },
    { key: "relocation_stage", label: "Stage", required: true },
  ],
};

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

  test("rejects empty metadata-required stage and context fields", () => {
    const result = createEnrollmentSchema(phase).safeParse({
      stage: "   ",
      context: { origin_country: "" },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual([
        "stage",
        "context.origin_country",
      ]);
    }
  });

  test("accepts optional metadata stage and applies the default stage", () => {
    const result = createEnrollmentSchema({
      ...phase,
      onboarding_field_metadata: [
        { key: "origin_country", label: "Origin", required: false },
        { key: "relocation_stage", label: "Stage", required: false },
      ],
    }).parse({ stage: "", context: {} });

    expect(result).toEqual({ stage: "arrived", context: {} });
  });

  test("keeps stage required when stage metadata is missing", () => {
    const result = createEnrollmentSchema({
      ...phase,
      onboarding_field_metadata: undefined,
    }).safeParse({ stage: "", context: {} });

    expect(result.success).toBe(false);
  });

  test("supports custom context metadata keys", () => {
    const result = createEnrollmentSchema({
      ...phase,
      onboarding_fields: ["destination", "stage"],
      onboarding_field_metadata: [
        { key: "destination", label: "Destination", required: true },
        { key: "stage", label: "Stage", required: true },
      ],
    }).safeParse({ stage: "planning", context: { destination: "" } });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["context", "destination"]);
    }
  });
});
