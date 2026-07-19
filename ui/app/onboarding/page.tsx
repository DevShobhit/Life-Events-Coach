import Link from "next/link";

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-6 py-12 sm:px-10">
      <p className="text-sm font-medium tracking-wide text-primary">
        YOUR CONTEXT
      </p>
      <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
        Start with where you are.
      </h1>
      <p className="max-w-xl text-lg leading-7 text-muted-foreground">
        Onboarding persistence is coming with the enrollment API. For now, the
        route is ready for that contract.
      </p>
      <Link
        className="inline-flex min-h-11 w-fit items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground"
        href="/now"
      >
        Continue to Now
      </Link>
    </main>
  );
}
