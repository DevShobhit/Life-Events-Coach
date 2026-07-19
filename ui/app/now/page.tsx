export default function NowPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10 sm:px-10">
      <p className="text-sm font-medium tracking-wide text-primary">TODAY</p>
      <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
        Your next steady step
      </h1>
      <p className="max-w-xl text-lg leading-7 text-muted-foreground">
        Your roadmap will appear here once your context is connected.
      </p>
    </main>
  );
}
