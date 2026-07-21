import { describe, expect, test } from "bun:test";

import { updateEditorialConcern, updateEditorialMetadata } from "./editorial-form";

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

  test("updates only the selected concern and normalizes bullets", () => {
    const module = {
      schema_version: "1.0",
      phase_id: "relocation",
      onboarding_fields: [],
      source_policy: [],
      concerns: [
        { id: "housing", title: "Housing", bullets: ["old"], why_now: "now" },
        { id: "school", title: "School", bullets: ["keep"], why_now: "later" },
      ],
    } as never;

    const updated = updateEditorialConcern(
      module,
      "housing",
      "bullets",
      " first \n\n second ",
    );

    expect(updated.concerns).toEqual([
      expect.objectContaining({ id: "housing", bullets: ["first", "second"] }),
      expect.objectContaining({ id: "school", bullets: ["keep"] }),
    ]);
  });

  test("updates nested card and citation fields immutably", () => {
    const module = {
      schema_version: "1.0",
      phase_id: "relocation",
      onboarding_fields: [],
      source_policy: [],
      concerns: [
        {
          id: "housing",
          title: "Housing",
          bullets: [],
          why_now: "now",
          card: { body: "old" },
          citation: { reviewed_on: "2026-01-01" },
        },
      ],
    } as never;

    const withCard = updateEditorialConcern(module, "housing", "card.body", "new");
    const withCitation = updateEditorialConcern(
      withCard,
      "housing",
      "citation.reviewed_on",
      "2026-07-21",
    );

    expect(withCitation.concerns[0]).toEqual(
      expect.objectContaining({
        card: { body: "new" },
        citation: { reviewed_on: "2026-07-21" },
      }),
    );
  });
});
