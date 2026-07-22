import { describe, expect, test } from "bun:test";

describe("context settings recovery", () => {
  test("offers a retry action when settings data cannot load", async () => {
    const source = await Bun.file("features/enrollment/components/context-settings.tsx").text();
    expect(source).toContain("Retry loading context");
    expect(source).toContain("enrollment.refetch");
    expect(source).toContain("phases.refetch");
  });
});
