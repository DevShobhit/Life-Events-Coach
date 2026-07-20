import { describe, expect, test } from "bun:test";
import { optimisticallyRemove } from "./mutations";
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
      citation_url: "",
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
      citation_url: "",
      reason: "",
    },
  ],
  horizon: [],
};

describe("roadmap optimistic updates", () => {
  test("promotes the next card after removing the acted-on card", () => {
    const next = optimisticallyRemove(roadmap, "first");
    expect(next?.now.map((card) => card.concern_id)).toEqual(["second"]);
    expect(next?.current?.concern_id).toBe("second");
  });
});
