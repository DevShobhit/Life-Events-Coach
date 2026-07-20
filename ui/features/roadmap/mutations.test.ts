import { describe, expect, test } from "bun:test";
import { ApiError } from "@/lib/api/errors";
import {
  offlineQueuedMessage,
  optimisticallyRemove,
  roadmapMutationError,
  runOfflineRoadmapOperation,
} from "./mutations";
import type { RoadmapResponse } from "./types";

const roadmap: RoadmapResponse = {
  phase_id: "phase",
  version: 1,
  current: null,
  now: [
    {
      concern_id: "first",
      title: "First",
      view: "",
      horizon_days: 0,
      hidden_factor: false,
      bullets: [],
      why_now: "",
      citation_id: "",
      citation_title: "",
      citation_url: "",
      visual_url: null,
      reason: "",
    },
    {
      concern_id: "second",
      title: "Second",
      view: "",
      horizon_days: 0,
      hidden_factor: false,
      bullets: [],
      why_now: "",
      citation_id: "",
      citation_title: "",
      citation_url: "",
      visual_url: null,
      reason: "",
    },
  ],
  horizon: [],
};

describe("roadmap optimistic updates", () => {
  test("does not throw when offline storage fails during a mutation callback", () => {
    expect(() =>
      runOfflineRoadmapOperation(() => {
        throw new Error("storage unavailable");
      }),
    ).not.toThrow();
  });

  test("promotes the next card after removing the acted-on card", () => {
    const next = optimisticallyRemove(roadmap, "first");
    expect(next?.now.map((card) => card.concern_id)).toEqual(["second"]);
    expect(next?.current?.concern_id).toBe("second");
  });

  test("uses the offline recovery message for queueable failures", () => {
    expect(roadmapMutationError(new ApiError("dependency_unavailable", null, 503))).toBe(
      offlineQueuedMessage,
    );
  });
});
