"use client";

import { useState } from "react";

import { RoadmapCardView } from "@/components/roadmap-card";
import { RouteError, RouteLoading } from "@/components/route-states";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { CardAction } from "@/lib/api/types";
import { nextSkipCount, shouldAskRelevance } from "@/lib/roadmap/transitions";
import { useRoadmap } from "@/lib/roadmap/use-roadmap";
import { useSessionStore } from "@/lib/state/session";

export default function NowPage() {
  const userId = useSessionStore((state) => state.developmentUserId);
  const phaseId = useSessionStore((state) => state.activePhase);
  const { act, error, isLoading, load, pendingAction, roadmap } = useRoadmap(
    userId,
    phaseId,
  );
  const [skipCounts, setSkipCounts] = useState<Record<string, number>>({});
  const [relevanceCard, setRelevanceCard] = useState<string | null>(null);

  if (isLoading && !roadmap) return <RouteLoading />;
  if (error && !roadmap) return <RouteError onRetry={() => void load()} />;

  const current = roadmap?.current;
  const cardData = current
    ? {
        concernId: current.concern_id,
        title: current.title,
        bullets: current.bullets,
        whyNow: current.why_now,
        hiddenFactor: current.hidden_factor,
        source: { title: current.citation_id, url: current.citation_url },
      }
    : null;
  const submitAction = async (concernId: string, action: CardAction) => {
    if (action === "skip") {
      const nextCount = nextSkipCount(skipCounts[concernId] ?? 0);
      setSkipCounts((counts) => ({ ...counts, [concernId]: nextCount }));
      if (shouldAskRelevance(nextCount)) setRelevanceCard(concernId);
    }
    await act(concernId, action);
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10 sm:px-10">
      <div className="space-y-2">
        <p className="text-sm font-medium tracking-wide text-primary">TODAY</p>
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
          Your next steady step
        </h1>
        <p className="max-w-xl text-lg leading-7 text-muted-foreground">
          One practical action at a time, shaped by your phase.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error.message}
        </p>
      ) : null}
      {current && cardData ? (
        <div className="w-full max-w-2xl">
          <RoadmapCardView
            card={cardData}
            onAction={(action) => void submitAction(current.concern_id, action)}
            pendingAction={
              pendingAction === "done" || pendingAction === "skip"
                ? pendingAction
                : undefined
            }
          />
          {roadmap.now.length > 1 ? (
            <section aria-label="Up next" className="mt-6 space-y-3">
              <h2 className="text-sm font-medium tracking-wide text-muted-foreground">
                UP NEXT
              </h2>
              {roadmap.now.slice(1, 5).map((queuedCard) => (
                <div
                  className="rounded-lg border border-border bg-card p-4"
                  key={queuedCard.concern_id}
                >
                  <h3 className="font-medium">{queuedCard.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {queuedCard.why_now}
                  </p>
                </div>
              ))}
            </section>
          ) : null}
        </div>
      ) : (
        <output className="rounded-lg border border-dashed border-border p-8 text-center">
          <h2 className="text-xl font-medium">You are caught up.</h2>
          <p className="mt-2 text-muted-foreground">
            Ask a question or check Horizon when you want to look further ahead.
          </p>
        </output>
      )}
      <AlertDialog
        open={Boolean(relevanceCard)}
        onOpenChange={(open) => !open && setRelevanceCard(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Is this relevant to you?</AlertDialogTitle>
            <AlertDialogDescription>
              You have skipped this twice. Keep it in your roadmap, or remove it
              as not relevant?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep deciding</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (relevanceCard)
                  void submitAction(relevanceCard, "not_relevant");
                setRelevanceCard(null);
              }}
            >
              Not relevant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
