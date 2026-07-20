"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { PhaseModule } from "@/lib/api/types";
import { enrollmentContextFromForm } from "./phase-metadata";
import type { EnrollmentFormValues } from "./schema";

export function useEnrollmentSaveMutation(
  userId: string,
  phaseId: string,
  phaseModule?: PhaseModule,
) {
  return useMutation({
    mutationKey: ["enrollment", "save", userId, phaseId],
    mutationFn: (values: EnrollmentFormValues) =>
      apiClient.saveEnrollment(userId, phaseId, {
        ...enrollmentContextFromForm(phaseModule, values),
      }),
  });
}
