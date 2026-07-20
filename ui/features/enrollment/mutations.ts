"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { EnrollmentFormValues } from "./schema";

export function useEnrollmentSaveMutation(userId: string, phaseId: string) {
  return useMutation({
    mutationKey: ["enrollment", "save", userId, phaseId],
    mutationFn: (values: EnrollmentFormValues) =>
      apiClient.saveEnrollment(userId, phaseId, { stage: values.stage }),
  });
}
