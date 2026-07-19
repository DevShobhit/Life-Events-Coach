"use client";

import { RoadmapCardView } from "@/components/roadmap-card";
import { RouteError, RouteLoading } from "@/components/route-states";
import { useRoadmap } from "@/lib/roadmap/use-roadmap";
import { useSessionStore } from "@/lib/state/session";

export default function NowPage() {
  const userId = useSessionStore((state) => state.developmentUserId);
  const phaseId = useSessionStore((state) => state.activePhase);
  const { act, error, isLoading, load, pendingAction, roadmap } = useRoadmap(
    userId,
    phaseId,
  );

  if (isLoading && !roadmap) return <RouteLoading />;
  if (error && !roadmap) return <RouteError onRetry={() => void load()} />;

  const current = roadmap?.current;

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
      {current ? (
        <div className="w-full max-w-2xl">
          <RoadmapCardView
            card={{
              concernId: current.concern_id,
              title: current.title,
              bullets: current.bullets,
              whyNow: current.why_now,
              hiddenFactor: current.hidden_factor,
              source: { title: current.citation_id, url: current.citation_url },
            }}
            onAction={(action) => void act(current.concern_id, action)}
            pendingAction={
              pendingAction === "done" || pendingAction === "skip"
                ? pendingAction
                : undefined
            }
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
    </main>
  );
}
