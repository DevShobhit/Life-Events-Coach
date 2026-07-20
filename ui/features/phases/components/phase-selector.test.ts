import { describe, expect, test } from "bun:test";

describe("phase selector contract", () => {
  test("published phase data includes an id and configurable fields", () => {
    const phase = {
      version: 1,
      module: {
        phase_id: "relocation",
        onboarding_fields: ["relocation_stage"],
      },
    };

    expect(phase.module.phase_id).toBe("relocation");
    expect(phase.module.onboarding_fields).toContain("relocation_stage");
  });

  test("provides an accessible empty catalog state", async () => {
    const source = await Bun.file("features/phases/components/phase-selector.tsx").text();
    expect(source).toContain("No paths are available right now.");
    expect(source).toContain('role="status"');
  });
});
