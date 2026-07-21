"use client";

import { useRef, useState } from "react";
import { AskSheet } from "@/components/ask-sheet";
import { InlineError } from "@/components/feedback/inline-error";
import { RoadmapCardView } from "@/components/roadmap-card";
import {
  RouteError,
  RouteLoading,
  SetupState,
} from "@/components/route-states";
import { RoadmapActionDialogs } from "@/features/roadmap/components/roadmap-action-dialogs";
import { RoadmapDetailSheet } from "@/features/roadmap/components/roadmap-detail-sheet";
import { RoadmapQueue } from "@/features/roadmap/components/roadmap-queue";
import {
  offlineQueuedMessage,
  useRoadmapActionMutation,
} from "@/features/roadmap/mutations";
import { useRoadmapQuery } from "@/features/roadmap/queries";
import type { CardAction } from "@/lib/api/types";
import { useRouteLoadLogging } from "@/lib/logging/route-load";
import { nextSkipCount, shouldAskRelevance } from "@/lib/roadmap/transitions";
import { useSessionStore } from "@/lib/state/session";
import {
  getUserFacingError,
  isApiErrorCode,
  shouldQueueRoadmapAction,
} from "@/lib/ux/feedback";

export default function NowPage() {
  const userId = useSessionStore(
    (state) => state.authenticatedUserId ?? state.developmentUserId,
  );
  const phaseId = useSessionStore((state) => state.activePhase);
  const stage = useSessionStore((state) => state.activeStage);
  const query = useRoadmapQuery(userId, phaseId, stage);
  const mutation = useRoadmapActionMutation(userId, phaseId, stage);
  const roadmap = query.data ?? null;
  const error = query.error
    ? getUserFacingError(query.error)
    : mutation.error && !shouldQueueRoadmapAction(mutation.error)
      ? getUserFacingError(mutation.error)
      : null;
  const isLoading = query.isLoading;
  const isCached = query.isPlaceholderData;
  useRouteLoadLogging("now", {
    enabled: Boolean(userId.trim() && phaseId.trim() && stage.trim()),
    isLoading,
    hasData: Boolean(roadmap),
    error: query.error,
  });
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
  const [detailOpen, setDetailOpen] = useState(false);
  const detailTriggerRef = useRef<HTMLButtonElement | null>(null);

  if (!userId.trim() || !phaseId.trim() || !stage.trim()) return <SetupState />;
  if (isLoading && !roadmap) return <RouteLoading />;
  if (isApiErrorCode(query.error, "not_found") && !roadmap)
    return <SetupState />;
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
        source: { title: current.citation_title, url: current.citation_url },
        visualUrl: current.visual_url ?? undefined,
        citationStale: current.citation_stale,
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
    <main
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10 sm:px-10"
      id="main-content"
    >
      <AskSheet phaseId={phaseId} stage={stage} userId={userId} />
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
        <InlineError message={error} onRetry={() => void query.refetch()} />
      ) : null}
      {offlineMessage ? (
        <output aria-live="polite" className="text-sm text-muted-foreground">
          {offlineMessage}
        </output>
      ) : null}
      {isCached ? (
        <output aria-live="polite" className="text-sm text-muted-foreground">
          Showing your last saved roadmap. We will refresh when the connection
          returns.
        </output>
      ) : null}
      {current && cardData ? (
        <div className="w-full max-w-2xl">
          <RoadmapCardView
            card={cardData}
            detailTriggerRef={detailTriggerRef}
            onAction={(action) => void submitAction(current.concern_id, action)}
            onDetail={() => setDetailOpen(true)}
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
          <RoadmapDetailSheet
            card={cardData}
            onOpenChange={setDetailOpen}
            open={detailOpen}
            triggerRef={detailTriggerRef}
          />
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
