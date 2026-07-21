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

export type EditorialConcernField = "title" | "why_now" | "bullets";

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
      const nextValue = field === "bullets"
        ? value.split("\n").map((item) => item.trim()).filter(Boolean)
        : value;
      return { ...concern, [field]: nextValue } as EditorialConcern;
    }),
  };
}
