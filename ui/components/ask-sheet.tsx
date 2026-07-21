"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

export function didAskSheetClose(previousOpen: boolean, open: boolean) {
  return previousOpen && !open;
}

export function askModeMessage(mode: string) {
  return mode === "refusal"
    ? "We could not find an answer in the approved sources. Please rephrase your question."
    : null;
}

export function isRetryableAskError(error: unknown) {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? error.status
      : undefined;
  return status === 408 || status === 429 || status === 503 || status === 504;
}

const quickPrompts = [
  "What should I do first?",
  "What can catch me off guard?",
  "What should I prepare this week?",
];

export function AskSheet({
  phaseId,
  stage,
  userId,
}: {
  phaseId: string;
  stage?: string;
  userId: string;
}) {
  const form = useForm<AskFormValues>({
    resolver: zodResolver(askSchema),
    defaultValues: { question: "" },
  });
  const submitMutation = useAskSubmitMutation(userId, phaseId);
  const foldMutation = useAskFoldMutation(userId, phaseId, stage);

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
  const [folded, setFolded] = useState(false);
  const resetForm = form.reset;
  const resetSubmitMutation = submitMutation.reset;
  const resetFoldMutation = foldMutation.reset;
  const previousOpenRef = useRef(open);
  const fold = async () => {
    if (!response?.roadmap_proposal) return;
    try {
      await foldMutation.mutateAsync(response.roadmap_proposal.concern_id);
      setFolded(true);
      submitMutation.reset();
    } catch {
      // The mutation error is rendered below with the configured safe message.
    }
  };

  useEffect(() => {
    if (didAskSheetClose(previousOpenRef.current, open)) {
      resetForm();
      resetSubmitMutation();
      resetFoldMutation();
      setFolded(false);
    }
    previousOpenRef.current = open;
  }, [open, resetFoldMutation, resetForm, resetSubmitMutation]);

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
        {!response && !folded ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Try a common question</p>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <Button
                  className="min-h-11 whitespace-normal text-left"
                  key={prompt}
                  onClick={() =>
                    form.setValue("question", prompt, { shouldValidate: true })
                  }
                  type="button"
                  variant="outline"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
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
          <div className="space-y-2" role="alert">
            <p className="text-sm text-destructive">
              {getUserFacingError(error)}
            </p>
            {submitMutation.error && isRetryableAskError(submitMutation.error) ? (
              <Button
                className="min-h-11"
                disabled={submitMutation.isPending}
                onClick={() => void submit(form.getValues())}
                type="button"
                variant="outline"
              >
                Retry question
              </Button>
            ) : null}
          </div>
        ) : null}
        {folded ? (
          <p aria-live="polite" className="text-sm text-muted-foreground">
            Added to your roadmap.
          </p>
        ) : null}
        {response ? (
          <div
            aria-live="polite"
            className="space-y-4 border-t border-border pt-4"
          >
            <p className="leading-7">{response.answer}</p>
            {askModeMessage(response.mode) ? (
              <div aria-live="polite" className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {askModeMessage(response.mode)}
                </p>
                <Button
                  className="min-h-11"
                  onClick={() => {
                    form.reset();
                    submitMutation.reset();
                  }}
                  type="button"
                  variant="outline"
                >
                  Try another question
                </Button>
              </div>
            ) : null}
            {response.citations.length ? (
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
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            {response.roadmap_proposal && !folded ? (
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
