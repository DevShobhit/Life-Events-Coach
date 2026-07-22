"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { getUserFacingError } from "@/lib/ux/feedback";

export function PhaseLifecycleSettings({
  userId,
  phaseId,
}: {
  userId: string;
  phaseId: string;
}) {
  const queryClient = useQueryClient();
  const enrollment = useQuery({
    queryKey: ["enrollment", userId, phaseId],
    queryFn: ({ signal }) => apiClient.enrollment(userId, phaseId, signal),
  });
  const history = useQuery({
    queryKey: ["enrollment", userId, "history"],
    queryFn: ({ signal }) => apiClient.enrollmentHistory(userId, signal),
  });
  const mutation = useMutation({
    mutationFn: (action: "complete" | "archive") =>
      action === "complete"
        ? apiClient.completeEnrollment(userId, phaseId)
        : apiClient.archiveEnrollment(userId, phaseId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["enrollment", userId, phaseId] }),
        queryClient.invalidateQueries({ queryKey: ["enrollment", userId, "history"] }),
      ]);
    },
  });

  if (enrollment.isLoading) {
    return <p aria-live="polite">Loading phase lifecycle…</p>;
  }
  if (enrollment.error) {
    return (
      <div className="space-y-3" role="alert">
        <p className="text-sm text-destructive">
          {getUserFacingError(enrollment.error)}
        </p>
        <Button
          className="min-h-11"
          onClick={() => void enrollment.refetch()}
          type="button"
          variant="outline"
        >
          Retry phase lifecycle
        </Button>
      </div>
    );
  }

  const status = enrollment.data?.status ?? "active";
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Current phase status: <span className="font-medium text-foreground">{status}</span>
      </p>
      {mutation.error ? (
        <p className="text-sm text-destructive" role="alert">
          {getUserFacingError(mutation.error)}
        </p>
      ) : null}
      {mutation.isSuccess ? (
        <p aria-live="polite" className="text-sm text-muted-foreground">
          Phase status updated.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        {status === "active" ? (
          <Button
            className="min-h-11"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate("complete")}
            type="button"
          >
            Mark phase complete
          </Button>
        ) : null}
        {status !== "archived" ? (
          <Button
            className="min-h-11"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate("archive")}
            type="button"
            variant="outline"
          >
            Archive phase
          </Button>
        ) : null}
      </div>
      {history.data?.length ? (
        <div className="space-y-2" aria-label="Phase history">
          <h3 className="text-sm font-medium">Recent history</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {history.data.slice(0, 5).map((event) => (
              <li key={`${event.event}-${event.occurred_at}`}>
                {event.event} · {new Date(event.occurred_at).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
