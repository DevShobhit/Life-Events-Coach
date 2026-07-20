import { describe, expect, test } from "bun:test";
import { ROADMAP_QUERY_STALE_TIME_MS } from "@/lib/query/query-client";
import { roadmapQueryKeys } from "./query-keys";
import { roadmapQueryOptions } from "./queries";

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

  test("applies the roadmap freshness policy to detail reads", () => {
    const options = roadmapQueryOptions("user", "phase");

    expect(options.queryKey).toEqual(roadmapQueryKeys.detail("user", "phase"));
    expect(options.staleTime).toBe(ROADMAP_QUERY_STALE_TIME_MS);
    expect(options.refetchOnReconnect).toBe(false);
  });
});
