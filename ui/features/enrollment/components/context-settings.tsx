"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
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
  fieldIsRequired,
  fieldLabel,
  fieldMetadata,
  phaseDescription,
  phaseDisplayName,
  stageMetadata,
  stageValueFromContext,
} from "@/features/enrollment/phase-metadata";
import { useEnrollmentQuery } from "@/features/enrollment/queries";
import {
  createEnrollmentSchema,
  type EnrollmentFormInput,
  type EnrollmentFormValues,
} from "@/features/enrollment/schema";
import { usePublishedPhasesQuery } from "@/features/phases/queries";
import { roadmapQueryKeys } from "@/features/roadmap/query-keys";
import { useSessionStore } from "@/lib/state/session";
import { getUserFacingError } from "@/lib/ux/feedback";

export function ContextSettings({
  phaseId,
  userId,
}: {
  phaseId: string;
  userId: string;
}) {
  const enrollment = useEnrollmentQuery(userId, phaseId);
  const phases = usePublishedPhasesQuery();
  const setActiveStage = useSessionStore((state) => state.setActiveStage);
  const queryClient = useQueryClient();
  const phase = phases.data?.find(
    (publishedPhase) => publishedPhase.module.phase_id === phaseId,
  );
  const phaseModule = phase?.module;
  const mutation = useEnrollmentSaveMutation(userId, phaseId, phaseModule);
  const fields =
    phaseModule?.onboarding_fields.filter(
      (field) => !["stage", "relocation_stage"].includes(field),
    ) ?? [];
  const configuredStage = phaseModule ? stageMetadata(phaseModule) : undefined;
  const form = useForm<EnrollmentFormInput, unknown, EnrollmentFormValues>({
    resolver: zodResolver(createEnrollmentSchema(phaseModule)),
    defaultValues: { context: {}, stage: "" },
  });

  useEffect(() => {
    if (enrollment.data) {
      form.reset({
        context: enrollment.data.context,
        stage: stageValueFromContext(phaseModule, enrollment.data.context),
      });
    }
  }, [enrollment.data, form, phaseModule]);

  if (enrollment.isLoading || phases.isLoading) {
    return <p aria-live="polite">Loading your context…</p>;
  }
  if (enrollment.error || phases.error) {
    return (
      <div className="space-y-3" role="alert">
        <p className="text-sm text-destructive">
          We could not load your context. Please retry.
        </p>
        <Button
          className="min-h-11"
          onClick={() => {
            void enrollment.refetch();
            void phases.refetch();
          }}
          type="button"
          variant="outline"
        >
          Retry loading context
        </Button>
      </div>
    );
  }

  const save = async (values: EnrollmentFormValues) => {
    await mutation.mutateAsync(values);
    setActiveStage(values.stage);
    await queryClient.invalidateQueries({
      queryKey: roadmapQueryKeys.detail(userId, phaseId, values.stage),
    });
  };

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(save)} noValidate>
      {phaseModule ? (
        <div className="space-y-1">
          <h2 className="text-xl font-medium tracking-tight">
            {phaseDisplayName(phaseModule)}
          </h2>
          {phaseDescription(phaseModule) ? (
            <p className="text-sm text-muted-foreground">
              {phaseDescription(phaseModule)}
            </p>
          ) : null}
        </div>
      ) : null}
      <FieldGroup>
        <Field data-invalid={Boolean(form.formState.errors.stage)}>
          <FieldLabel htmlFor="settings-stage">
            {configuredStage?.label ?? "Current stage"}{" "}
            <span className="font-normal">
              ({configuredStage?.required === false ? "optional" : "required"})
            </span>
          </FieldLabel>
          <Input
            aria-invalid={Boolean(form.formState.errors.stage)}
            aria-describedby="settings-stage-description settings-stage-error"
            autoComplete="off"
            id="settings-stage"
            required={
              phaseModule
                ? fieldIsRequired(
                    phaseModule,
                    configuredStage?.key ?? "stage",
                    {
                      stage: true,
                    },
                  )
                : true
            }
            {...form.register("stage")}
          />
          <FieldDescription id="settings-stage-description">
            {configuredStage?.description ??
              "This changes which roadmap steps appear first."}
          </FieldDescription>
          <FieldError
            id="settings-stage-error"
            errors={[form.formState.errors.stage]}
          />
        </Field>
        {fields.map((field) => {
          const metadata = phaseModule
            ? fieldMetadata(phaseModule, field)
            : undefined;
          const required = phaseModule
            ? fieldIsRequired(phaseModule, field)
            : false;

          const error = form.formState.errors.context?.[field];
          const descriptionId = `settings-${field}-description`;
          const errorId = `settings-${field}-error`;

          return (
            <Field data-invalid={Boolean(error)} key={field}>
              <FieldLabel htmlFor={`settings-${field}`}>
                {metadata?.label ?? fieldLabel(field)}{" "}
                <span className="font-normal">
                  ({required ? "required" : "optional"})
                </span>
              </FieldLabel>
              <Input
                aria-describedby={`${descriptionId} ${errorId}`}
                aria-invalid={Boolean(error)}
                autoComplete="off"
                id={`settings-${field}`}
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
      {mutation.error ? (
        <p className="text-sm text-destructive" role="alert">
          {getUserFacingError(mutation.error)}
        </p>
      ) : null}
      {mutation.isSuccess ? (
        <p aria-live="polite" className="text-sm text-muted-foreground">
          Context saved. Your roadmap is refreshing.
        </p>
      ) : null}
      <Button className="min-h-11" disabled={mutation.isPending} type="submit">
        {mutation.isPending ? "Saving…" : "Save context"}
      </Button>
    </form>
  );
}
