"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api/client";
import type { AskResponse } from "@/lib/api/types";

export function AskSheet({
  phaseId,
  userId,
}: {
  phaseId: string;
  userId: string;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFolding, setIsFolding] = useState(false);

  useEffect(() => {
    const syncQuery = () =>
      setOpen(new URLSearchParams(window.location.search).get("ask") === "1");
    syncQuery();
    window.addEventListener("popstate", syncQuery);
    return () => window.removeEventListener("popstate", syncQuery);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      setResponse(await apiClient.ask(userId, phaseId, question.trim()));
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError
          : new Error("Unable to answer question"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const fold = async () => {
    if (!response?.roadmap_proposal) return;
    setIsFolding(true);
    setError(null);
    try {
      await apiClient.fold(
        userId,
        phaseId,
        response.roadmap_proposal.concern_id,
        crypto.randomUUID(),
      );
      setResponse({ ...response, roadmap_proposal: null });
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError
          : new Error("Unable to update roadmap"),
      );
    } finally {
      setIsFolding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ask about your path</DialogTitle>
          <DialogDescription>
            Answers use approved sources for the active phase.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <Input
            aria-label="Your question"
            maxLength={500}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="What should I know next?"
            value={question}
          />
          <Button
            className="min-h-11"
            disabled={isSubmitting || !question.trim()}
            type="submit"
          >
            {isSubmitting ? "Thinking…" : "Ask"}
          </Button>
        </form>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error.message}
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
                  disabled={isFolding}
                  onClick={() => void fold()}
                >
                  {isFolding ? "Adding…" : "Add to my roadmap"}
                </Button>
              </DialogFooter>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
