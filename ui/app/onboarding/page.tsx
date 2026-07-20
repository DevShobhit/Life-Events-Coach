"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import { useSessionStore } from "@/lib/state/session";
import { getUserFacingError } from "@/lib/ux/feedback";

export default function OnboardingPage() {
  const [stage, setStage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const userId = useSessionStore((state) => state.developmentUserId);
  const phaseId = useSessionStore((state) => state.activePhase);
  const router = useRouter();

  const continueToNow = async () => {
    if (!stage.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      await apiClient.saveEnrollment(userId, phaseId, { stage: stage.trim() });
      router.push("/now");
    } catch (nextError) {
      setError(getUserFacingError(nextError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-6 py-12 sm:px-10">
      <div className="space-y-3">
        <p className="text-sm font-medium tracking-wide text-primary">
          YOUR CONTEXT
        </p>
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
          Start with where you are.
        </h1>
        <p className="text-lg leading-7 text-muted-foreground">
          A little context helps Steady Path keep the next step practical.
        </p>
      </div>
      <form
        className="space-y-3"
        id="onboarding-form"
        onSubmit={(event) => {
          event.preventDefault();
          void continueToNow();
        }}
      >
        <Label htmlFor="stage">What best describes your current stage?</Label>
        <Input
          autoComplete="off"
          id="stage"
          name="stage"
          onChange={(event) => setStage(event.target.value)}
          placeholder="For example: preparing to move…"
          value={stage}
        />
        <p className="text-sm text-muted-foreground">
          Your context is saved to the active development enrollment.
        </p>
      </form>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        className="min-h-11 w-fit"
        disabled={!stage.trim() || isSaving}
        form="onboarding-form"
        type="submit"
      >
        {isSaving ? "Saving…" : "Continue to Now"}
      </Button>
    </main>
  );
}
