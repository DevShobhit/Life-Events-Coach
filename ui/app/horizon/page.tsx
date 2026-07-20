"use client";

import { useState } from "react";

import { RouteError, RouteLoading } from "@/components/route-states";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRoadmapQuery } from "@/features/roadmap/queries";
import type { RoadmapCard } from "@/lib/api/types";
import { useSessionStore } from "@/lib/state/session";
import { getUserFacingError } from "@/lib/ux/feedback";

export default function HorizonPage() {
  const userId = useSessionStore((state) => state.developmentUserId);
  const phaseId = useSessionStore((state) => state.activePhase);
  const {
    error: queryError,
    isLoading,
    refetch,
    data: roadmap,
  } = useRoadmapQuery(userId, phaseId);
  const error = queryError ? getUserFacingError(queryError) : null;
  const [selectedCard, setSelectedCard] = useState<RoadmapCard | null>(null);

  if (isLoading && !roadmap) return <RouteLoading />;
  if (error && !roadmap) return <RouteError onRetry={() => void refetch()} />;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10 sm:px-10">
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
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
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
                Around {group.horizon_days} days
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {group.cards.map((card) => (
                  <button
                    className="min-h-24 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    key={card.concern_id}
                    onClick={() => setSelectedCard(card)}
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
    </main>
  );
}
