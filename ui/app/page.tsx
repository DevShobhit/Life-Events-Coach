import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-6 py-16 sm:px-10">
      <div className="space-y-4">
        <p className="text-sm font-medium tracking-wide text-primary">
          STEADY PATH
        </p>
        <h1 className="max-w-xl text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
          A calmer way to take the next step.
        </h1>
        <p className="max-w-lg text-lg leading-7 text-muted-foreground">
          Practical guidance for the work, decisions, and details that come with
          a life transition.
        </p>
      </div>
      <Link
        className="inline-flex h-11 w-fit items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        href="/onboarding"
      >
        Begin with your context
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
      <p className="text-sm text-muted-foreground">
        Your roadmap stays practical, private, and in your control.
      </p>
    </main>
  );
}
