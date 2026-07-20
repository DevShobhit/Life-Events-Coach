import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading page"
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10 sm:px-10"
    >
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-72 max-w-full" />
      <Skeleton className="h-24 w-full max-w-2xl" />
    </main>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 items-center px-6 py-10 sm:px-10">
      <Alert className="gap-3" variant="destructive">
        <AlertCircle aria-hidden="true" />
        <AlertTitle>We could not load this page</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          <span>Try again, or return to Now when you are ready.</span>
          <Button className="min-h-11" onClick={onRetry} variant="outline">
            <RefreshCw aria-hidden="true" /> Retry
          </Button>
        </AlertDescription>
      </Alert>
    </main>
  );
}
