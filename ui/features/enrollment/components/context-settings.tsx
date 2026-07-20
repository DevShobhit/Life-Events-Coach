"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { useEnrollmentQuery } from "@/features/enrollment/queries";
import {
  type EnrollmentFormValues,
  enrollmentSchema,
} from "@/features/enrollment/schema";
import { useEnrollmentSaveMutation } from "@/features/enrollment/mutations";
import { usePublishedPhasesQuery } from "@/features/phases/queries";
import { roadmapQueryKeys } from "@/features/roadmap/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { getUserFacingError } from "@/lib/ux/feedback";

function labelFor(field: string) {
  return field
    .split(/[-_]/u)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ContextSettings({
  phaseId,
  userId,
}: {
  phaseId: string;
  userId: string;
}) {
  const enrollment = useEnrollmentQuery(userId, phaseId);
  const phases = usePublishedPhasesQuery();
  const mutation = useEnrollmentSaveMutation(userId, phaseId);
  const queryClient = useQueryClient();
  const form = useForm<EnrollmentFormValues>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: { context: {}, stage: "" },
  });
  const fields =
    phases.data
      ?.find((phase) => phase.module.phase_id === phaseId)
      ?.module.onboarding_fields.filter(
        (field) => !["stage", "relocation_stage"].includes(field),
      ) ?? [];

  useEffect(() => {
    if (enrollment.data) {
      form.reset({
        context: enrollment.data.context,
        stage: enrollment.data.context.stage ?? "",
      });
    }
  }, [enrollment.data, form]);

  if (enrollment.isLoading || phases.isLoading) {
    return <p aria-live="polite">Loading your context…</p>;
  }
  if (enrollment.error || phases.error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        We could not load your context. Please refresh and retry.
      </p>
    );
  }

  const save = async (values: EnrollmentFormValues) => {
    await mutation.mutateAsync(values);
    await queryClient.invalidateQueries({
      queryKey: roadmapQueryKeys.detail(userId, phaseId),
    });
  };

  return (
    <form
      className="space-y-5"
      onSubmit={form.handleSubmit(save)}
      noValidate
    >
      <FieldGroup>
        <Field data-invalid={Boolean(form.formState.errors.stage)}>
          <FieldLabel htmlFor="settings-stage">Current stage</FieldLabel>
          <Input
            aria-invalid={Boolean(form.formState.errors.stage)}
            autoComplete="off"
            id="settings-stage"
            {...form.register("stage")}
          />
          <FieldDescription>
            This changes which roadmap steps appear first.
          </FieldDescription>
          <FieldError errors={[form.formState.errors.stage]} />
        </Field>
        {fields.map((field) => (
          <Field key={field}>
            <FieldLabel htmlFor={`settings-${field}`}>
              {labelFor(field)} <span className="font-normal">(optional)</span>
            </FieldLabel>
            <Input
              autoComplete="off"
              id={`settings-${field}`}
              {...form.register(`context.${field}`)}
            />
          </Field>
        ))}
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
