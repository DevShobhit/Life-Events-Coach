"use client";

import { Check, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublishedPhaseModule } from "@/lib/api/types";

function phaseName(phaseId: string) {
  return phaseId
    .split(/[-_]/u)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function PhaseSelector({
  phases,
  selectedPhaseId,
  onSelect,
}: {
  phases: PublishedPhaseModule[];
  selectedPhaseId: string | null;
  onSelect: (phaseId: string) => void;
}) {
  if (phases.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground" role="status">
        No paths are available right now. Please try again later.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {phases.map(({ module }) => {
        const selected = selectedPhaseId === module.phase_id;
        const name = module.display_name || phaseName(module.phase_id);
        const description =
          module.description ||
          `A guided path for your ${phaseName(module.phase_id).toLowerCase()} transition.`;
        return (
          <Button
            aria-pressed={selected}
            className="min-h-20 justify-start gap-3 whitespace-normal px-4 text-left"
            key={module.phase_id}
            onClick={() => onSelect(module.phase_id)}
            type="button"
            variant={selected ? "secondary" : "outline"}
          >
            <Compass aria-hidden="true" className="size-5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{name}</span>
              <span className="mt-1 block text-sm font-normal text-muted-foreground">
                {description}
              </span>
            </span>
            {selected ? <Check aria-hidden="true" className="size-4" /> : null}
          </Button>
        );
      })}
    </div>
  );
}
