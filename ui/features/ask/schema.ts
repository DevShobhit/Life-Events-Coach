import { z } from "zod";

export const askSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "Write a question before sending.")
    .max(500, "Keep your question under 500 characters."),
});

export type AskFormValues = z.infer<typeof askSchema>;
