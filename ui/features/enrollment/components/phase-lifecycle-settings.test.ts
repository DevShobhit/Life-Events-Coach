import { describe, expect, test } from "bun:test";

describe("phase lifecycle settings contract", () => {
  test("exposes explicit completion, archive, history, and retry controls", async () => {
    const source = await Bun.file(
      "features/enrollment/components/phase-lifecycle-settings.tsx",
    ).text();

    expect(source).toContain("Mark phase complete");
    expect(source).toContain("Archive phase");
    expect(source).toContain("Recent history");
    expect(source).toContain("Retry phase lifecycle");
  });
});
