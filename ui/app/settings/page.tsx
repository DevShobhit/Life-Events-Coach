"use client";

import { ContextSettings } from "@/features/enrollment/components/context-settings";
import { PhaseLifecycleSettings } from "@/features/enrollment/components/phase-lifecycle-settings";
import { NotificationSettings } from "@/features/notifications/components/notification-settings";
import { useSessionStore } from "@/lib/state/session";

export default function SettingsPage() {
  const developmentUserId = useSessionStore((state) => state.developmentUserId);
  const activePhase = useSessionStore((state) => state.activePhase);
  const reducedMotion = useSessionStore((state) => state.reducedMotion);
  const setReducedMotion = useSessionStore((state) => state.setReducedMotion);

  return (
    <main
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10 sm:px-10"
      id="main-content"
    >
      <div className="space-y-2">
        <p className="text-sm font-medium tracking-wide text-primary">
          SETTINGS
        </p>
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
          Keep the experience useful.
        </h1>
        <p className="text-lg leading-7 text-muted-foreground">
          Only preferences supported by the current client are shown here.
        </p>
      </div>
      <section
        aria-labelledby="context-heading"
        className="space-y-4 rounded-lg border border-border bg-card p-5"
      >
        <div>
          <h2 className="font-medium" id="context-heading">
            Phase &amp; context
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update the details that shape your roadmap.
          </p>
        </div>
        <ContextSettings phaseId={activePhase} userId={developmentUserId} />
      </section>
      <section
        className="space-y-4 rounded-lg border border-border bg-card p-5"
        aria-labelledby="lifecycle-heading"
      >
        <div>
          <h2 className="font-medium" id="lifecycle-heading">
            Phase lifecycle
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Finish or archive this phase when your circumstances change.
          </p>
        </div>
        <PhaseLifecycleSettings
          phaseId={activePhase}
          userId={developmentUserId}
        />
      </section>
      <section
        className="space-y-4 rounded-lg border border-border bg-card p-5"
        aria-labelledby="notification-heading"
      >
        <div>
          <h2 className="font-medium" id="notification-heading">
            Daily reminders
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose whether reminders are enabled and when they should arrive.
          </p>
        </div>
        <NotificationSettings userId={developmentUserId} />
      </section>
      <section
        className="space-y-4 rounded-lg border border-border bg-card p-5"
        aria-labelledby="motion-heading"
      >
        <div>
          <h2 className="font-medium" id="motion-heading">
            Reduced motion
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Avoid non-essential motion in the interface.
          </p>
        </div>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <input
            checked={reducedMotion}
            className="size-4 accent-primary"
            onChange={(event) => setReducedMotion(event.target.checked)}
            type="checkbox"
          />
          Use reduced motion
        </label>
      </section>
      <section
        className="space-y-2 rounded-lg border border-border bg-muted/30 p-5"
        aria-labelledby="identity-heading"
      >
        <h2 className="font-medium" id="identity-heading">
          Development session
        </h2>
        <p className="text-sm text-muted-foreground">
          Current local request identity:{" "}
          <code className="font-mono text-foreground">{developmentUserId}</code>
        </p>
        <p className="text-xs text-muted-foreground">
          This is request scoping for local development, not authentication.
        </p>
      </section>
    </main>
  );
}
