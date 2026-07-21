"use client";

import { useActiveEnrollmentsQuery } from "@/features/enrollment/queries";
import { useSessionStore } from "@/lib/state/session";

export function PhaseSwitcher({ userId }: { userId: string }) {
  const activePhase = useSessionStore((state) => state.activePhase);
  const setActivePhase = useSessionStore((state) => state.setActivePhase);
  const enrollments = useActiveEnrollmentsQuery(userId);
  const activeEnrollments = enrollments.data ?? [];

  if (enrollments.isLoading || enrollments.isError || activeEnrollments.length < 2) {
    return null;
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <span className="sr-only">Active path</span>
      <select
        aria-label="Active path"
        className="min-h-10 rounded-md border border-input bg-background px-2 text-sm text-foreground"
        value={activePhase}
        onChange={(event) => {
          const nextPhase = event.target.value;
          if (activeEnrollments.some((enrollment) => enrollment.phase_id === nextPhase)) {
            setActivePhase(nextPhase);
          }
        }}
      >
        {activeEnrollments.map((enrollment) => (
          <option key={enrollment.phase_id} value={enrollment.phase_id}>
            {enrollment.phase_id.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}
