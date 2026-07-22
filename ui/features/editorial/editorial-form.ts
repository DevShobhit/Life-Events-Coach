import type { EditorialConcern, PhaseModule } from "@/lib/api/types";

export type EditorialMetadataField = "display_name" | "description" | "source_policy";

export function updateEditorialMetadata(
  module: PhaseModule,
  field: EditorialMetadataField,
  value: string,
): PhaseModule {
  if (field === "source_policy") {
    return {
      ...module,
      source_policy: value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    };
  }
  return { ...module, [field]: value };
}

export type EditorialConcernField =
  | "title"
  | "why_now"
  | "bullets"
  | "urgency"
  | "horizon_days"
  | "card.body"
  | "citation.reviewed_on"
  | "citation.title"
  | "citation.url"
  | "citation.source_type";

export function updateEditorialConcern(
  module: PhaseModule,
  concernId: string,
  field: EditorialConcernField,
  value: string,
): PhaseModule {
  return {
    ...module,
    concerns: module.concerns.map((concern) => {
      if (concern.id !== concernId) return concern;
      if (field === "card.body") {
        return { ...concern, card: { ...concern.card, body: value } };
      }
      if (field.startsWith("citation.")) {
        const citationField = field.slice("citation.".length) as keyof EditorialConcern["citation"];
        return {
          ...concern,
          citation: { ...concern.citation, [citationField]: value },
        };
      }
      const nextValue = field === "bullets"
        ? value.split("\n").map((item) => item.trim()).filter(Boolean)
        : field === "urgency" || field === "horizon_days"
          ? Number(value)
          : value;
      return { ...concern, [field]: nextValue } as EditorialConcern;
    }),
  };
}

export type EditorialThresholdField =
  | "freshness_days"
  | "now_window_days"
  | "horizon_days";

export function updateEditorialThreshold(
  module: PhaseModule,
  field: EditorialThresholdField,
  value: string,
): PhaseModule {
  return {
    ...module,
    thresholds: {
      ...module.thresholds,
      [field]: Number(value),
    },
  };
}
