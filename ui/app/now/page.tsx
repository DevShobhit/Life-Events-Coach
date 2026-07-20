"use client";

import { useState } from "react";
import { AskSheet } from "@/components/ask-sheet";
import { RoadmapCardView } from "@/components/roadmap-card";
import { RouteError, RouteLoading } from "@/components/route-states";
import { RoadmapActionDialogs } from "@/features/roadmap/components/roadmap-action-dialogs";
import { RoadmapQueue } from "@/features/roadmap/components/roadmap-queue";
import {
  offlineQueuedMessage,
  useRoadmapActionMutation,
} from "@/features/roadmap/mutations";
import { useRoadmapQuery } from "@/features/roadmap/queries";
import type { CardAction } from "@/lib/api/types";
import { nextSkipCount, shouldAskRelevance } from "@/lib/roadmap/transitions";
import { useSessionStore } from "@/lib/state/session";
import {
  getUserFacingError,
  shouldQueueRoadmapAction,
} from "@/lib/ux/feedback";

export default function NowPage() {
  const userId = useSessionStore((state) => state.developmentUserId);
  const phaseId = useSessionStore((state) => state.activePhase);
  const query = useRoadmapQuery(userId, phaseId);
  const mutation = useRoadmapActionMutation(userId, phaseId);
  const roadmap = query.data ?? null;
  const error = query.error
    ? getUserFacingError(query.error)
    : mutation.error && !shouldQueueRoadmapAction(mutation.error)
      ? getUserFacingError(mutation.error)
      : null;
  const isLoading = query.isLoading;
  const isCached = query.isPlaceholderData;
  const offlineMessage =
    mutation.error && shouldQueueRoadmapAction(mutation.error)
      ? offlineQueuedMessage
      : null;
  const pendingAction = mutation.isPending
    ? (mutation.variables?.action ?? null)
    : null;
  const [skipCounts, setSkipCounts] = useState<Record<string, number>>({});
  const [relevanceCard, setRelevanceCard] = useState<string | null>(null);
  const [moreCard, setMoreCard] = useState<string | null>(null);

  if (isLoading && !roadmap) return <RouteLoading />;
  if (error && !roadmap)
    return <RouteError onRetry={() => void query.refetch()} />;

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
    try {
      await mutation.mutateAsync({
        concernId,
        action,
        idempotencyKey: crypto.randomUUID(),
      });
    } catch {
      // The mutation exposes the friendly error or queued status in the UI.
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10 sm:px-10">
      <AskSheet phaseId={phaseId} userId={userId} />
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
          {error}
        </p>
      ) : null}
      {offlineMessage ? (
        <output className="text-sm text-muted-foreground">
          {offlineMessage}
        </output>
      ) : null}
      {isCached ? (
        <output className="text-sm text-muted-foreground">
          Showing your last saved roadmap. We will refresh when the connection
          returns.
        </output>
      ) : null}
      {current && cardData ? (
        <div className="w-full max-w-2xl">
          <RoadmapCardView
            card={cardData}
            onAction={(action) => void submitAction(current.concern_id, action)}
            onMore={() => setMoreCard(current.concern_id)}
            pendingAction={
              pendingAction === "done" ||
              pendingAction === "skip" ||
              pendingAction === "already_handled"
                ? pendingAction
                : undefined
            }
          />
          <RoadmapQueue cards={roadmap.now} />
        </div>
      ) : (
        <output className="rounded-lg border border-dashed border-border p-8 text-center">
          <h2 className="text-xl font-medium">You are caught up.</h2>
          <p className="mt-2 text-muted-foreground">
            Ask a question or check Horizon when you want to look further ahead.
          </p>
        </output>
      )}
      <RoadmapActionDialogs
        moreCard={moreCard}
        onAction={(concernId, action) => {
          void submitAction(concernId, action);
          setMoreCard(null);
          setRelevanceCard(null);
        }}
        onMoreChange={(open) => !open && setMoreCard(null)}
        onRelevanceChange={(open) => !open && setRelevanceCard(null)}
        relevanceCard={relevanceCard}
      />
    </main>
  );
}
