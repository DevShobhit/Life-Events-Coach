import { describe, expect, test } from "bun:test";
import { roadmapQueryKeys } from "./query-keys";

describe("roadmap query keys", () => {
  test("builds the stable detail key", () => {
    expect(roadmapQueryKeys.detail("user", "phase", "arrived")).toEqual([
      "roadmap",
      "detail",
      "user",
      "phase",
      "arrived",
    ]);
  });
});
