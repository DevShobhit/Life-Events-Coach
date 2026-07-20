"use client";

import { useEffect, useRef, useState } from "react";

import { InlineError } from "@/components/feedback/inline-error";
import {
  RouteError,
  RouteLoading,
  SetupState,
} from "@/components/route-states";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { horizonGroupLabel } from "@/features/roadmap/horizon";
import { useRoadmapActionMutation } from "@/features/roadmap/mutations";
import { useRoadmapQuery } from "@/features/roadmap/queries";
import type { RoadmapCard } from "@/lib/api/types";
import { useRouteLoadLogging } from "@/lib/logging/route-load";
import { useSessionStore } from "@/lib/state/session";
import { getUserFacingError } from "@/lib/ux/feedback";

export default function HorizonPage() {
  const userId = useSessionStore((state) => state.developmentUserId);
  const phaseId = useSessionStore((state) => state.activePhase);
  const stage = useSessionStore((state) => state.activeStage);
  const mutation = useRoadmapActionMutation(userId, phaseId, stage);
  const {
    error: queryError,
    isLoading,
    refetch,
    data: roadmap,
  } = useRoadmapQuery(userId, phaseId, stage);
  const error = queryError
    ? getUserFacingError(queryError)
    : mutation.error
      ? getUserFacingError(mutation.error)
      : null;
  useRouteLoadLogging("horizon", {
    enabled: Boolean(userId.trim() && phaseId.trim() && stage.trim()),
    isLoading,
    hasData: Boolean(roadmap),
    error: queryError,
  });
  const [selectedCard, setSelectedCard] = useState<RoadmapCard | null>(null);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const selectedTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!selectedCard) selectedTriggerRef.current?.focus();
  }, [selectedCard]);

  if (!userId.trim() || !phaseId.trim() || !stage.trim()) return <SetupState />;

  const removeAsNotRelevant = async () => {
    if (!selectedCard) return;
    try {
      await mutation.mutateAsync({
        concernId: selectedCard.concern_id,
        action: "not_relevant",
        idempotencyKey: crypto.randomUUID(),
      });
      setConfirmRemoval(false);
      setSelectedCard(null);
    } catch {
      // The mutation state is rendered below without exposing raw API text.
    }
  };

  if (isLoading && !roadmap) return <RouteLoading />;
  if (error && !roadmap) return <RouteError onRetry={() => void refetch()} />;

  return (
    <main
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10 sm:px-10"
      id="main-content"
    >
      <div className="space-y-2">
        <p className="text-sm font-medium tracking-wide text-primary">
          HORIZON
        </p>
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
          See what is ahead.
        </h1>
        <p className="max-w-xl text-lg leading-7 text-muted-foreground">
          A read-only view of the work that may matter next.
        </p>
      </div>
      {error ? (
        <InlineError message={error} onRetry={() => void refetch()} />
      ) : null}
      {roadmap?.horizon.length ? (
        <div className="space-y-8">
          {roadmap.horizon.map((group) => (
            <section
              aria-labelledby={`horizon-${group.horizon_days}`}
              className="space-y-3"
              key={group.horizon_days}
            >
              <h2
                className="text-lg font-medium"
                id={`horizon-${group.horizon_days}`}
              >
                {horizonGroupLabel(group.horizon_days)} · Around{" "}
                {group.horizon_days} days
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {group.cards.map((card) => (
                  <button
                    className="min-h-24 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    key={card.concern_id}
                    onClick={() => setSelectedCard(card)}
                    ref={
                      selectedCard?.concern_id === card.concern_id
                        ? selectedTriggerRef
                        : undefined
                    }
                    type="button"
                  >
                    <span className="block font-medium">{card.title}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {card.reason}
                    </span>
                    {card.hidden_factor ? (
                      <span className="mt-3 block text-xs text-hidden-factor">
                        Hidden factor
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <output className="rounded-lg border border-dashed border-border p-8 text-center">
          <h2 className="text-xl font-medium">Nothing further ahead yet.</h2>
          <p className="mt-2 text-muted-foreground">
            Your Horizon will grow as your roadmap responds to your context.
          </p>
        </output>
      )}
      <Dialog
        open={Boolean(selectedCard)}
        onOpenChange={(open) => !open && setSelectedCard(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCard?.title}</DialogTitle>
            <DialogDescription>{selectedCard?.why_now}</DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm leading-6">
            {selectedCard?.bullets.map((bullet) => (
              <li className="flex gap-2" key={bullet}>
                <span aria-hidden="true">•</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <button
              className="min-h-11 rounded-md border border-destructive px-4 text-sm font-medium text-destructive"
              onClick={() => setConfirmRemoval(true)}
              type="button"
            >
              Not relevant to me
            </button>
            <DialogClose
              render={
                <button
                  className="min-h-11 rounded-md border border-border px-4 text-sm font-medium"
                  type="button"
                />
              }
            >
              Close
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmRemoval} onOpenChange={setConfirmRemoval}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this from your roadmap?</AlertDialogTitle>
            <AlertDialogDescription>
              This item will be marked as not relevant and removed from Now and
              Horizon.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={mutation.isPending}
              onClick={() => void removeAsNotRelevant()}
            >
              {mutation.isPending ? "Removing…" : "Not relevant"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
