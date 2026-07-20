import { describe, expect, test } from "bun:test";
import type { PhaseModule } from "@/lib/api/types";
import {
  fieldLabel,
  fieldMetadata,
  phaseDescription,
  phaseDisplayName,
  stageMetadata,
} from "./phase-metadata";

const module: PhaseModule = {
  schema_version: "1",
  phase_id: "relocation",
  display_name: "Relocation",
  description: "A practical path through an international move.",
  onboarding_fields: ["origin_country", "relocation_stage"],
  onboarding_field_metadata: [
    {
      key: "origin_country",
      label: "Country you are leaving",
      description: "Where your move begins.",
      required: true,
    },
    {
      key: "relocation_stage",
      label: "Move stage",
      description: "The point you have reached in your move.",
      required: true,
    },
  ],
};

describe("phase metadata helpers", () => {
  test("uses configured phase display metadata with safe fallbacks", () => {
    expect(phaseDisplayName(module)).toBe("Relocation");
    expect(phaseDescription(module)).toBe(
      "A practical path through an international move.",
    );
    expect(phaseDisplayName({ ...module, display_name: null })).toBe(
      "Relocation",
    );
    expect(phaseDescription({ ...module, description: null })).toBeNull();
  });

  test("resolves stage metadata from either supported stage key", () => {
    expect(stageMetadata(module)).toMatchObject({ key: "relocation_stage" });
    expect(
      stageMetadata({
        ...module,
        onboarding_field_metadata: [
          { key: "stage", label: "Current stage", required: true },
        ],
      }),
    ).toMatchObject({ key: "stage", label: "Current stage" });
  });

  test("returns field metadata and generated fallback labels", () => {
    expect(fieldMetadata(module, "origin_country")?.label).toBe(
      "Country you are leaving",
    );
    expect(fieldMetadata(module, "missing_field")).toBeUndefined();
    expect(fieldLabel("missing_field")).toBe("Missing Field");
  });
});
