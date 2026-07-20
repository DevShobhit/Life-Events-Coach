import type { PhaseModule } from "@/lib/api/types";

export type OnboardingFieldMetadata = NonNullable<
  PhaseModule["onboarding_field_metadata"]
>[number];

export function fieldLabel(field: string) {
  return field
    .split(/[-_]/u)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function phaseDisplayName(module: PhaseModule) {
  return module.display_name?.trim() || fieldLabel(module.phase_id);
}

export function phaseDescription(module: PhaseModule) {
  return module.description?.trim() || null;
}

export function fieldMetadata(module: PhaseModule, field: string) {
  return module.onboarding_field_metadata?.find(
    (metadata) => metadata.key === field,
  );
}

export function stageMetadata(module: PhaseModule) {
  return (
    fieldMetadata(module, "stage") ?? fieldMetadata(module, "relocation_stage")
  );
}
