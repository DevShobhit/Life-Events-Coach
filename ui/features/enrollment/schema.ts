import { z } from "zod";

export const enrollmentSchema = z.object({
  stage: z.string().trim().min(1, "Tell us a little about your current stage."),
  context: z.record(z.string()).optional(),
});

export type EnrollmentFormInput = z.input<typeof enrollmentSchema>;
export type EnrollmentFormValues = z.output<typeof enrollmentSchema>;
