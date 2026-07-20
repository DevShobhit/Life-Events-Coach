"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useEnrollmentSaveMutation } from "@/features/enrollment/mutations";
import {
  type EnrollmentFormValues,
  enrollmentSchema,
} from "@/features/enrollment/schema";
import { useSessionStore } from "@/lib/state/session";
import { getUserFacingError } from "@/lib/ux/feedback";

export default function OnboardingPage() {
  const userId = useSessionStore((state) => state.developmentUserId);
  const phaseId = useSessionStore((state) => state.activePhase);
  const router = useRouter();
  const mutation = useEnrollmentSaveMutation(userId, phaseId);
  const form = useForm<EnrollmentFormValues>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: { stage: "" },
  });

  const continueToNow = async (values: EnrollmentFormValues) => {
    try {
      await mutation.mutateAsync(values);
      router.push("/now");
    } catch {
      // The mutation error is rendered below without exposing raw API text.
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-6 py-12 sm:px-10">
      <div className="space-y-3">
        <p className="text-sm font-medium tracking-wide text-primary">
          YOUR CONTEXT
        </p>
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
          Start with where you are.
        </h1>
        <p className="text-lg leading-7 text-muted-foreground">
          A little context helps Steady Path keep the next step practical.
        </p>
      </div>
      <form
        className="space-y-3"
        id="onboarding-form"
        onSubmit={form.handleSubmit(continueToNow)}
        noValidate
      >
        <FieldGroup>
          <Field data-invalid={Boolean(form.formState.errors.stage)}>
            <FieldLabel htmlFor="stage">
              What best describes your current stage?
            </FieldLabel>
            <Input
              aria-invalid={Boolean(form.formState.errors.stage)}
              autoComplete="off"
              id="stage"
              placeholder="For example: preparing to move…"
              {...form.register("stage")}
            />
            <FieldDescription>
              Your context is saved to the active development enrollment.
            </FieldDescription>
            <FieldError errors={[form.formState.errors.stage]} />
          </Field>
        </FieldGroup>
      </form>
      {mutation.error ? (
        <p className="text-sm text-destructive" role="alert">
          {getUserFacingError(mutation.error)}
        </p>
      ) : null}
      <Button
        className="min-h-11 w-fit"
        disabled={mutation.isPending}
        form="onboarding-form"
        type="submit"
      >
        {mutation.isPending ? "Saving…" : "Continue to Now"}
      </Button>
    </main>
  );
}
