import { EditorialWorkspace } from "@/features/editorial/components/editorial-workspace";

export default function EditorialPage() {
  return (
    <main
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10 sm:px-10"
      id="main-content"
    >
      <header className="space-y-2">
        <p className="text-sm font-medium tracking-wide text-primary">
          EDITORIAL
        </p>
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
          Shape the curriculum.
        </h1>
        <p className="max-w-2xl text-lg leading-7 text-muted-foreground">
          Edit a draft, validate its citations, preview the content, and publish
          a reviewed version.
        </p>
      </header>
      <EditorialWorkspace />
    </main>
  );
}
