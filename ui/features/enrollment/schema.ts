import { z } from "zod";
import type { PhaseModule } from "@/lib/api/types";
import { fieldIsRequired, stageFieldKey } from "./phase-metadata";

export const enrollmentSchema = z.object({
  stage: z.string().trim().min(1, "Tell us a little about your current stage."),
  context: z.record(z.string()).optional(),
});

export function createEnrollmentSchema(phaseModule?: PhaseModule) {
  const stageRequired = phaseModule
    ? fieldIsRequired(phaseModule, stageFieldKey(phaseModule), {
        stage: true,
      })
    : true;
  const requiredContextFields = phaseModule
    ? phaseModule.onboarding_fields.filter(
        (field) =>
          !["stage", "relocation_stage"].includes(field) &&
          fieldIsRequired(phaseModule, field),
      )
    : [];

  const context = z
    .record(z.string())
    .optional()
    .superRefine((values, ctx) => {
      for (const field of requiredContextFields) {
        if (!values?.[field]?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: "This field is required.",
          });
        }
      }
    });

  const stage = stageRequired
    ? z.string().trim().min(1, "Tell us a little about your current stage.")
    : z.preprocess(
        (value) =>
          typeof value === "string" && !value.trim() ? undefined : value,
        z.string().trim().optional().default("arrived"),
      );

  return z.object({ stage, context });
}

export type EnrollmentFormInput = z.input<
  ReturnType<typeof createEnrollmentSchema>
>;
export type EnrollmentFormValues = z.output<
  ReturnType<typeof createEnrollmentSchema>
>;
