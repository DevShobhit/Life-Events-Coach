"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api/client";
import { getUserFacingError } from "@/lib/ux/feedback";

export function NotificationSettings({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["notifications", "preferences", userId],
    queryFn: ({ signal }) => apiClient.notificationPreferences(userId, signal),
  });
  const mutation = useMutation({
    mutationFn: (preference: {
      enabled: boolean;
      timezone: string;
      local_time: string;
    }) => apiClient.saveNotificationPreferences(userId, preference),
    onSuccess: (preference) => {
      queryClient.setQueryData(
        ["notifications", "preferences", userId],
        preference,
      );
    },
  });
  const [enabled, setEnabled] = useState(false);
  const [timezone, setTimezone] = useState("UTC");
  const [localTime, setLocalTime] = useState("09:00:00");

  useEffect(() => {
    if (query.data) {
      setEnabled(query.data.enabled);
      setTimezone(query.data.timezone);
      setLocalTime(query.data.local_time);
    }
  }, [query.data]);

  if (query.isLoading) {
    return <p aria-live="polite">Loading notification preferences…</p>;
  }
  if (query.error) {
    return (
      <div className="space-y-3" role="alert">
        <p className="text-sm text-destructive">
          {getUserFacingError(query.error)}
        </p>
        <Button
          className="min-h-11"
          onClick={() => void query.refetch()}
          type="button"
          variant="outline"
        >
          Retry notification preferences
        </Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate({ enabled, timezone, local_time: localTime });
      }}
    >
      <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input
          checked={enabled}
          className="size-4 accent-primary"
          onChange={(event) => setEnabled(event.target.checked)}
          type="checkbox"
        />
        Send daily roadmap reminders
      </label>
      <Field>
        <FieldLabel htmlFor="notification-timezone">Timezone</FieldLabel>
        <Input
          id="notification-timezone"
          onChange={(event) => setTimezone(event.target.value)}
          value={timezone}
        />
        <FieldDescription>
          Use an IANA timezone such as UTC or Asia/Kolkata.
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="notification-local-time">Local delivery time</FieldLabel>
        <Input
          id="notification-local-time"
          onChange={(event) => setLocalTime(event.target.value)}
          type="time"
          value={localTime.slice(0, 5)}
        />
      </Field>
      {mutation.error ? (
        <p className="text-sm text-destructive" role="alert">
          {getUserFacingError(mutation.error)}
        </p>
      ) : null}
      {mutation.isSuccess ? (
        <p aria-live="polite" className="text-sm text-muted-foreground">
          Notification preferences saved.
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Delivery status: {query.data?.delivery_status ?? "not_configured"}.
      </p>
      <Button className="min-h-11" disabled={mutation.isPending} type="submit">
        {mutation.isPending ? "Saving…" : "Save notification preferences"}
      </Button>
    </form>
  );
}
