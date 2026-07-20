import { AlertCircle, RefreshCw } from "lucide-react";
import {
  Alert,
  AlertAction,
  AlertDescription,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function InlineError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Alert className="gap-3" variant="destructive">
      <AlertCircle aria-hidden="true" />
      <AlertDescription>{message}</AlertDescription>
      {onRetry ? (
        <AlertAction>
          <Button
            aria-label="Retry request"
            className="min-h-11"
            onClick={onRetry}
            size="sm"
            variant="outline"
          >
            <RefreshCw aria-hidden="true" /> Retry
          </Button>
        </AlertAction>
      ) : null}
    </Alert>
  );
}
