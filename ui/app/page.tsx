import {
  ArrowRight,
  Check,
  Compass,
  Eye,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";

const factors = [
  {
    icon: HeartHandshake,
    title: "The human part",
    text: "How the change is landing with you, and who needs to be part of the next decision.",
  },
  {
    icon: Compass,
    title: "The practical part",
    text: "The details that create pressure when they arrive too late.",
  },
  {
    icon: Eye,
    title: "The part beneath",
    text: "The assumptions and trade-offs that a generic checklist cannot see.",
  },
] as const;

const process = [
  "Tell us what is changing and what matters right now.",
  "See the factors that shape your next decision.",
  "Take one useful step, at a pace that is yours.",
] as const;

export default function Home() {
  return (
    <main id="main-content">
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-8 sm:pb-24 lg:px-10 lg:pb-32">
        <header className="flex min-h-20 items-center justify-between gap-4 sm:min-h-24">
          <Logo />
          <nav aria-label="Main navigation">
            <Link
              className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline decoration-primary/25 underline-offset-4 transition-colors hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              href="#how-it-works"
            >
              How it works
            </Link>
          </nav>
        </header>

        <section className="grid items-center gap-12 pt-10 sm:pt-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(25rem,1.1fr)] lg:gap-20 lg:pt-20">
          <div className="max-w-xl">
            <p className="text-sm font-medium text-primary">
              For the in-between chapters
            </p>
            <h1 className="landing-display mt-4 text-foreground">
              A clearer next step, when life feels in motion.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-8 text-muted-foreground [text-wrap:pretty]">
              LiveCoach turns a big transition into a calm, practical
              roadmap—built around your context, not a one-size-fits-all
              checklist.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-0"
                href="/onboarding"
              >
                Begin with your context
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center px-4 text-sm font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                href="#how-it-works"
              >
                See how it works
              </Link>
            </div>
            <p className="mt-5 text-sm leading-5 text-muted-foreground">
              Private by design. No perfect plan required.
            </p>
          </div>

          <RoadmapPreview />
        </section>

        <section className="mt-20 border-t border-border pt-12 sm:mt-28 sm:pt-16 lg:mt-32">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-20">
            <div className="max-w-sm">
              <p className="text-sm font-medium text-primary">
                What a checklist cannot see
              </p>
              <h2 className="landing-heading mt-3 text-foreground">
                The next step is rarely only practical.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground [text-wrap:pretty]">
                A useful plan makes room for the details underneath the obvious
                decision.
              </p>
            </div>
            <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 sm:items-start">
              {factors.map((factor, index) => {
                const Icon = factor.icon;
                return (
                  <article
                    className={
                      index === 0
                        ? "border-t border-primary pt-5 sm:col-span-2 sm:max-w-md"
                        : "border-t border-border pt-5"
                    }
                    key={factor.title}
                  >
                    <Icon aria-hidden="true" className="size-5 text-primary" />
                    <h3 className="mt-4 text-lg font-medium leading-7 text-foreground [text-wrap:balance]">
                      {factor.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground [text-wrap:pretty]">
                      {factor.text}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-20 sm:mt-28 lg:mt-32" id="how-it-works">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-primary">
              A steady way through
            </p>
            <h2 className="landing-heading mt-3 text-foreground">
              Less noise. More of what helps.
            </h2>
          </div>
          <ol className="mt-10 grid gap-6 border-t border-border pt-6 sm:grid-cols-3 sm:gap-8">
            {process.map((step, index) => (
              <li className="flex gap-4" key={step}>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface text-sm font-medium text-primary">
                  {index + 1}
                </span>
                <p className="pt-0.5 text-base leading-7 text-muted-foreground [text-wrap:pretty]">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-20 rounded-xl bg-primary px-6 py-10 text-primary-foreground sm:mt-28 sm:px-10 sm:py-14 lg:mt-32">
          <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-end">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 text-sm text-primary-foreground">
                <ShieldCheck aria-hidden="true" className="size-4" />
                <span>Start where you are</span>
              </div>
              <h2 className="landing-heading mt-4 text-primary-foreground">
                You do not have to figure out the whole path today.
              </h2>
            </div>
            <Link
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md bg-background px-5 text-sm font-medium text-foreground transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              href="/onboarding"
            >
              Take the first step
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function RoadmapPreview() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-card sm:p-8">
      <div className="absolute -right-16 -top-16 size-52 rounded-full bg-accent/60 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-primary">Your roadmap</p>
            <h2 className="mt-2 text-2xl font-medium leading-8 tracking-[-0.02em] text-foreground [text-wrap:balance]">
              A little more clear.
            </h2>
          </div>
          <div className="rounded-full bg-surface p-2.5 text-primary">
            <Sparkles aria-hidden="true" className="size-4" />
          </div>
        </div>

        <ol className="mt-10 space-y-6">
          <RoadmapItem
            detail="A small step to start with"
            label="Make space for the change"
            state="done"
          />
          <RoadmapItem
            detail="Ready when you are"
            label="Find your first anchor"
            state="current"
          />
          <RoadmapItem
            detail="Coming into view"
            label="Prepare for the practical bits"
            state="next"
          />
        </ol>

        <div className="mt-10 border-t border-border pt-5">
          <div className="flex items-start gap-3">
            <Eye
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-hidden-factor"
            />
            <p className="text-sm leading-6 text-foreground">
              Sometimes the helpful next step is the one underneath the obvious
              one.
            </p>
          </div>
        </div>
      </div>
    </div>
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
    <li className="flex gap-4">
      <span
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${state === "done" ? "border-handled bg-handled text-primary-foreground" : state === "current" ? "border-primary bg-background" : "border-border bg-background"}`}
      >
        {state === "done" ? (
          <Check aria-hidden="true" className="size-3" />
        ) : null}
        {state === "current" ? (
          <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
        ) : null}
      </span>
      <div>
        <p
          className={`text-sm font-medium ${state === "next" ? "text-muted-foreground" : "text-foreground"}`}
        >
          {label}
        </p>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">{detail}</p>
      </div>
    </li>
  );
}
