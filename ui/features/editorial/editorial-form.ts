import type { PhaseModule } from "@/lib/api/types";

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
