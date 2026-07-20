import { ErrorState, LoadingState } from "@/components/feedback/route-state";

export const RouteLoading = LoadingState;
export const RouteError = ErrorState;

export function RouteNotFound() {
  return (
    <main
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-6 py-10 sm:px-10"
      id="main-content"
    >
      <p className="text-sm font-medium tracking-wide text-primary">
        STEADY PATH
      </p>
      <h1 className="text-3xl font-medium tracking-tight">
        That path is not available.
      </h1>
      <p className="text-lg text-muted-foreground">
        The page may have moved. Use the navigation to continue.
      </p>
    </main>
  );
}
