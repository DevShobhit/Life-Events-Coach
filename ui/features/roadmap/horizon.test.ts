import { describe, expect, test } from "bun:test";
import { horizonGroupLabel } from "./horizon";

describe("horizonGroupLabel", () => {
  test("labels the first month as soon", () => {
    expect(horizonGroupLabel(30)).toBe("Soon");
  });

  test("labels later time markers as later", () => {
    expect(horizonGroupLabel(31)).toBe("Later");
  });
});
