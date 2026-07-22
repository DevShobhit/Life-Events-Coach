import { describe, expect, test } from "bun:test";

import { nextSkipCount, shouldAskRelevance } from "./transitions";

describe("roadmap transitions", () => {
  test("increments a card skip count", () => {
    expect(nextSkipCount(0)).toBe(1);
    expect(nextSkipCount(1)).toBe(2);
  });

  test("asks for relevance at the configured threshold", () => {
    expect(shouldAskRelevance(1)).toBe(false);
    expect(shouldAskRelevance(2)).toBe(true);
    expect(shouldAskRelevance(3, 3)).toBe(true);
  });
});
