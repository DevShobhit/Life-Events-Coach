"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OnboardingPage() {
  const [stage, setStage] = useState("");
  const router = useRouter();

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
      <div className="space-y-3">
        <Label htmlFor="stage">What best describes your current stage?</Label>
        <Input
          id="stage"
          onChange={(event) => setStage(event.target.value)}
          placeholder="For example: preparing to move"
          value={stage}
        />
        <p className="text-sm text-muted-foreground">
          This is a local draft for now. Enrollment persistence will be
          connected when its API contract is available.
        </p>
      </div>
      <Button
        className="min-h-11 w-fit"
        disabled={!stage.trim()}
        onClick={() => router.push("/now")}
      >
        Continue to Now
      </Button>
    </main>
  );
}
