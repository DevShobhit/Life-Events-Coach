import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function InlineError({ message }: { message: string }) {
  return (
    <Alert className="gap-3" variant="destructive">
      <AlertCircle aria-hidden="true" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
