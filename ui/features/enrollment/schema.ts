import { z } from "zod";

export const enrollmentSchema = z.object({
  stage: z.string().trim().min(1, "Tell us a little about your current stage."),
});

export type EnrollmentFormValues = z.infer<typeof enrollmentSchema>;
