import { describe, expect, test } from "bun:test";
import type { RoadmapResponse } from "./types";
import { loadRoadmapOffline, persistRoadmapOffline } from "./queries";

const roadmap = {} as RoadmapResponse;

describe("roadmap offline persistence", () => {
  test("does not fail a successful query when local persistence fails", () => {
    expect(() =>
      persistRoadmapOffline(
        {
          write: () => {
            throw new Error("storage unavailable");
          },
        },
        "user",
        "phase",
        "arrived",
        roadmap,
      ),
    ).not.toThrow();
  });

  test("does not fail route initialization when offline reads fail", () => {
    expect(
      loadRoadmapOffline(
        {
          read: () => {
            throw new Error("storage unavailable");
          },
        },
        "user",
        "phase",
        "arrived",
      ),
    ).toBeUndefined();
  });
});
