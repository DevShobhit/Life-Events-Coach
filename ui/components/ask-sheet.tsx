"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  useAskFoldMutation,
  useAskSubmitMutation,
} from "@/features/ask/mutations";
import { type AskFormValues, askSchema } from "@/features/ask/schema";
import { getUserFacingError } from "@/lib/ux/feedback";

export function AskSheet({
  phaseId,
  userId,
}: {
  phaseId: string;
  userId: string;
}) {
  const form = useForm<AskFormValues>({
    resolver: zodResolver(askSchema),
    defaultValues: { question: "" },
  });
  const submitMutation = useAskSubmitMutation(userId, phaseId);
  const foldMutation = useAskFoldMutation(userId, phaseId);

  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const open = searchParams.get("ask") === "1";

  const setOpen = (nextOpen: boolean) => {
    if (nextOpen) {
      router.push(`${pathname}?ask=1`, { scroll: false });
    } else {
      router.replace(pathname, { scroll: false });
    }
  };

  const submit = async (values: AskFormValues) => {
    try {
      await submitMutation.mutateAsync(values);
    } catch {
      // The mutation error is rendered below with the configured safe message.
    }
  };

  const response = submitMutation.data;
  const fold = async () => {
    if (!response?.roadmap_proposal) return;
    try {
      await foldMutation.mutateAsync(response.roadmap_proposal.concern_id);
      submitMutation.reset();
    } catch {
      // The mutation error is rendered below with the configured safe message.
    }
  };

  useEffect(() => {
    if (!open) {
      form.reset();
      submitMutation.reset();
      foldMutation.reset();
    }
  }, [foldMutation, form, open, submitMutation]);

  const error = submitMutation.error ?? foldMutation.error;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ask about your path</DialogTitle>
          <DialogDescription>
            Answers use approved sources for the active phase.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={form.handleSubmit(submit)}
          noValidate
        >
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.question)}>
              <FieldLabel htmlFor="ask-question">Your question</FieldLabel>
              <Input
                aria-invalid={Boolean(form.formState.errors.question)}
                autoComplete="off"
                id="ask-question"
                maxLength={500}
                placeholder="What should I know next?…"
                {...form.register("question")}
              />
              <FieldError errors={[form.formState.errors.question]} />
            </Field>
          </FieldGroup>
          <Button
            className="min-h-11"
            disabled={submitMutation.isPending}
            type="submit"
          >
            {submitMutation.isPending ? "Thinking…" : "Ask"}
          </Button>
        </form>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {getUserFacingError(error)}
          </p>
        ) : null}
        {response ? (
          <div className="space-y-4 border-t border-border pt-4">
            <p className="leading-7">{response.answer}</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {response.citations.map((citation) => (
                <li key={citation.id}>
                  <a
                    className="underline"
                    href={citation.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {citation.title}
                  </a>
                </li>
              ))}
            </ul>
            {response.roadmap_proposal ? (
              <DialogFooter>
                <Button
                  className="min-h-11"
                  disabled={foldMutation.isPending}
                  onClick={() => void fold()}
                >
                  {foldMutation.isPending ? "Adding…" : "Add to my roadmap"}
                </Button>
              </DialogFooter>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
