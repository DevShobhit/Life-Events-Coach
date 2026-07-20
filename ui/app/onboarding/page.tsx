"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { RouteError, RouteLoading } from "@/components/route-states";
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
  type EnrollmentFormInput,
  type EnrollmentFormValues,
  createEnrollmentSchema,
} from "@/features/enrollment/schema";
import {
  fieldIsRequired,
  fieldLabel,
  fieldMetadata,
  stageMetadata,
} from "@/features/enrollment/phase-metadata";
import { PhaseSelector } from "@/features/phases/components/phase-selector";
import { usePublishedPhasesQuery } from "@/features/phases/queries";
import { useSessionStore } from "@/lib/state/session";
import { getUserFacingError } from "@/lib/ux/feedback";

export default function OnboardingPage() {
  const userId = useSessionStore((state) => state.developmentUserId);
  const activePhase = useSessionStore((state) => state.activePhase);
  const setActivePhase = useSessionStore((state) => state.setActivePhase);
  const setActiveStage = useSessionStore((state) => state.setActiveStage);
  const router = useRouter();
  const phasesQuery = usePublishedPhasesQuery();
  const [step, setStep] = useState(0);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const selectedPhase = phasesQuery.data?.find(
    (phase) => phase.module.phase_id === selectedPhaseId,
  );
  const mutation = useEnrollmentSaveMutation(
    userId,
    selectedPhaseId ?? activePhase,
    selectedPhase?.module,
  );
  const form = useForm<EnrollmentFormInput, unknown, EnrollmentFormValues>({
    resolver: zodResolver(createEnrollmentSchema(selectedPhase?.module)),
    defaultValues: { context: {}, stage: "" },
  });

  if (phasesQuery.isLoading) return <RouteLoading />;
  if (phasesQuery.error && !phasesQuery.data) {
    return <RouteError onRetry={() => void phasesQuery.refetch()} />;
  }

  const optionalFields = (selectedPhase?.module.onboarding_fields ?? []).filter(
    (field) => !["stage", "relocation_stage"].includes(field),
  );
  const configuredStage = selectedPhase
    ? stageMetadata(selectedPhase.module)
    : undefined;
  const stageRequired = selectedPhase
    ? fieldIsRequired(
        selectedPhase.module,
        configuredStage?.key ?? "stage",
        { stage: true },
      )
    : true;

  const continueToNow = async (values: EnrollmentFormValues) => {
    if (!selectedPhaseId) return;
    setActivePhase(selectedPhaseId);
    setActiveStage(values.stage);
    try {
      await mutation.mutateAsync(values);
      router.replace("/now");
    } catch {
      // The mutation error is rendered below without exposing raw API text.
    }
  };

  return (
    <main
      className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-6 py-12 sm:px-10"
      id="main-content"
    >
      <div className="space-y-3">
        <p className="text-sm font-medium tracking-wide text-primary">
          STEP {step + 1} OF 2
        </p>
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
          {step === 0
            ? "Choose the path you need."
            : "Start with where you are."}
        </h1>
        <p className="text-lg leading-7 text-muted-foreground">
          {step === 0
            ? "Pick one transition to shape your first roadmap."
            : "A little context helps keep the next step practical."}
        </p>
      </div>

      {step === 0 ? (
        <PhaseSelector
          phases={phasesQuery.data ?? []}
          selectedPhaseId={selectedPhaseId}
          onSelect={(phaseId) => {
            setSelectedPhaseId(phaseId);
            setStep(1);
          }}
        />
      ) : (
        <form
          className="space-y-5"
          id="onboarding-form"
          onSubmit={form.handleSubmit(continueToNow)}
          noValidate
        >
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.stage)}>
              <FieldLabel htmlFor="stage">
                {configuredStage?.label ?? "What best describes your current stage?"}{" "}
                <span className="font-normal">
                  ({stageRequired ? "required" : "optional"})
                </span>
              </FieldLabel>
              <Input
                aria-invalid={Boolean(form.formState.errors.stage)}
                aria-describedby="stage-description stage-error"
                autoComplete="off"
                id="stage"
                placeholder="For example: preparing to move…"
                required={stageRequired}
                {...form.register("stage")}
              />
              <FieldDescription id="stage-description">
                {configuredStage?.description ??
                  "This answer helps place the first step."}
              </FieldDescription>
              <FieldError
                id="stage-error"
                errors={[form.formState.errors.stage]}
              />
            </Field>
            {optionalFields.map((field) => {
              const metadata = selectedPhase
                ? fieldMetadata(selectedPhase.module, field)
                : undefined;
              const label = metadata?.label ?? fieldLabel(field);
              const required = selectedPhase
                ? fieldIsRequired(selectedPhase.module, field)
                : false;
              const error = form.formState.errors.context?.[field];
              const descriptionId = `context-${field}-description`;
              const errorId = `context-${field}-error`;

              return (
                <Field data-invalid={Boolean(error)} key={field}>
                  <FieldLabel htmlFor={`context-${field}`}>
                    {label}{" "}
                    <span className="font-normal">
                      ({required ? "required" : "optional"})
                    </span>
                  </FieldLabel>
                  <Input
                    aria-describedby={`${descriptionId} ${errorId}`}
                    aria-invalid={Boolean(error)}
                    autoComplete="off"
                    id={`context-${field}`}
                    placeholder={`Add your ${label.toLowerCase()}…`}
                    required={required}
                    {...form.register(`context.${field}`)}
                  />
                  {metadata?.description ? (
                    <FieldDescription id={descriptionId}>
                      {metadata.description}
                    </FieldDescription>
                  ) : null}
                  <FieldError id={errorId} errors={[error]} />
                </Field>
              );
            })}
          </FieldGroup>
          <div className="flex flex-wrap gap-3">
            <Button
              className="min-h-11"
              disabled={mutation.isPending}
              onClick={() => setStep(0)}
              type="button"
              variant="outline"
            >
              Back
            </Button>
            <Button
              className="min-h-11"
              disabled={mutation.isPending}
              form="onboarding-form"
              type="submit"
            >
              {mutation.isPending
                ? "Building your roadmap…"
                : "Continue to Now"}
            </Button>
            {optionalFields.length ? (
              <Button
                className="min-h-11"
                disabled={mutation.isPending}
                form="onboarding-form"
                type="submit"
                variant="ghost"
              >
                Skip optional details
              </Button>
            ) : null}
          </div>
        </form>
      )}
      {mutation.error ? (
        <p className="text-sm text-destructive" role="alert">
          {getUserFacingError(mutation.error)}
        </p>
      ) : null}
    </main>
  );
}
