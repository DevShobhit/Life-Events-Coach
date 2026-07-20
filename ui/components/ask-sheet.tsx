"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
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
import { getUserFacingError } from "@/lib/ux/feedback";

export function AskSheet({
  phaseId,
  userId,
}: {
  phaseId: string;
  userId: string;
}) {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFolding, setIsFolding] = useState(false);

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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      setResponse(await apiClient.ask(userId, phaseId, question.trim()));
    } catch (nextError) {
      setError(getUserFacingError(nextError));
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
      setError(getUserFacingError(nextError));
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
            autoComplete="off"
            aria-label="Your question"
            maxLength={500}
            name="question"
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="What should I know next?…"
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
            {error}
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
