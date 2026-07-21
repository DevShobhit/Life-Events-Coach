import { describe, expect, test } from "bun:test";

import { updateEditorialMetadata } from "./editorial-form";

describe("editorial metadata editor", () => {
  test("updates display metadata without dropping module content", () => {
    const module = {
      schema_version: "1.0",
      phase_id: "relocation",
      display_name: "Old name",
      onboarding_fields: ["stage"],
      source_policy: ["official"],
      concerns: [],
    };

    expect(updateEditorialMetadata(module, "display_name", "New name")).toEqual({
      ...module,
      display_name: "New name",
    });
  });

  test("normalizes source policy entries from one-per-line input", () => {
    const module = {
      schema_version: "1.0",
      phase_id: "relocation",
      onboarding_fields: [],
      source_policy: [],
      concerns: [],
    };

    expect(
      updateEditorialMetadata(module, "source_policy", " official \n\n public-records "),
    ).toEqual({ ...module, source_policy: ["official", "public-records"] });
  });
});
