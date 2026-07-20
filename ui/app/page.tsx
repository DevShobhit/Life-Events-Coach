import {
  ArrowRight,
  Check,
  Circle,
  Compass,
  Eye,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";

const steps = [
  {
    icon: Compass,
    title: "Name the transition",
    text: "Tell us what is changing and what feels most important right now.",
  },
  {
    icon: Sparkles,
    title: "See what matters next",
    text: "Get a short, ordered view of the decisions and details in front of you.",
  },
  {
    icon: Check,
    title: "Move at your pace",
    text: "Work through one useful step at a time. Your roadmap stays in your control.",
  },
] as const;

export default function Home() {
  return (
    <main
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-12 lg:py-16"
      id="main-content"
    >
      <section className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] lg:gap-20">
        <div className="max-w-xl">
          <Logo />

          <div className="mb-7 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-px w-8 bg-primary" />
            <span>For the in-between chapters</span>
          </div>
          <h1 className="max-w-lg text-5xl font-medium leading-[1.08] tracking-[-0.045em] text-foreground sm:text-6xl">
            A clearer next step, when life feels in motion.
          </h1>
          <p className="mt-7 max-w-md text-lg leading-8 text-muted-foreground">
            LiveCoach turns a big life transition into a calm, practical roadmap
            — built around your context, not a one-size-fits-all checklist.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-0"
              href="/onboarding"
            >
              Begin with your context
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              href="/now"
            >
              See how it works
            </Link>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            Private by design · No perfect plan required
          </p>
        </div>

        <div className="relative min-h-[420px] overflow-hidden rounded-xl border border-border bg-card p-5 shadow-card sm:p-8">
          <div className="absolute -right-20 -top-20 size-64 rounded-full bg-accent/60 blur-3xl" />
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Your roadmap
                </p>
                <h2 className="mt-2 text-2xl font-medium tracking-tight">
                  A little more clear.
                </h2>
              </div>
              <div className="rounded-full bg-accent p-2.5 text-accent-foreground">
                <Eye aria-hidden="true" className="size-4" />
              </div>
            </div>

            <div className="relative pl-8">
              <div className="absolute bottom-5 left-[9px] top-5 w-px bg-border" />
              <RoadmapItem
                state="done"
                label="Make space for the change"
                detail="A small step to start with"
              />
              <RoadmapItem
                state="current"
                label="Find your first anchor"
                detail="Ready when you are"
              />
              <RoadmapItem
                state="next"
                label="Prepare for the practical bits"
                detail="Coming into view"
              />
            </div>

            <div className="rounded-lg border border-hidden-factor/20 bg-hidden-factor/10 p-4">
              <div className="flex items-start gap-3">
                <Sparkles
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-hidden-factor"
                />
                <p className="text-sm leading-6 text-foreground">
                  Sometimes the helpful next step is the one underneath the
                  obvious one.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-24 border-t border-border pt-10 sm:mt-32 sm:pt-12">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.5fr] lg:gap-20">
          <div>
            <p className="text-sm font-medium text-primary">
              A steady way through
            </p>
            <h2 className="mt-3 max-w-sm text-3xl font-medium leading-tight tracking-[-0.03em]">
              Less noise. More of what helps.
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div className="border-t border-border pt-4" key={step.title}>
                  <Icon aria-hidden="true" className="size-5 text-primary" />
                  <h3 className="mt-5 text-base font-medium">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {step.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-24 rounded-xl bg-primary px-6 py-10 text-primary-foreground sm:px-10 sm:py-12">
        <div className="flex flex-col items-start justify-between gap-7 sm:flex-row sm:items-end">
          <div className="max-w-lg">
            <p className="text-sm text-primary-foreground/70">
              Start where you are
            </p>
            <h2 className="mt-2 text-3xl font-medium leading-tight tracking-[-0.03em]">
              You do not have to figure out the whole path today.
            </h2>
          </div>
          <Link
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md bg-background px-5 text-sm font-medium text-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            href="/onboarding"
          >
            Take the first step{" "}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}

function RoadmapItem({
  detail,
  label,
  state,
}: {
  detail: string;
  label: string;
  state: "done" | "current" | "next";
}) {
  return (
    <div className="relative mb-6 flex gap-4 last:mb-0">
      <div
        className={`absolute -left-8 top-0.5 flex size-[19px] items-center justify-center rounded-full border-2 ${state === "done" ? "border-handled bg-handled text-primary-foreground" : state === "current" ? "border-primary bg-background" : "border-border bg-background"}`}
      >
        {state === "done" ? (
          <Check aria-hidden="true" className="size-3" />
        ) : state === "current" ? (
          <Circle
            aria-hidden="true"
            className="size-2 fill-primary text-primary"
          />
        ) : null}
      </div>
      <div>
        <p
          className={`text-sm font-medium ${state === "next" ? "text-muted-foreground" : "text-foreground"}`}
        >
          {label}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
