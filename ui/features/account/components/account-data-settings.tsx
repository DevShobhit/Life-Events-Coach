"use client";

import { useState } from "react";

import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";

export function AccountDataSettings({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function exportData() {
    setBusy(true);
    setMessage(null);
    try {
      const data = await apiClient.exportAccount(userId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "lifecurriculum-data-export.json";
      link.click();
      URL.revokeObjectURL(url);
      setMessage("Your data export is ready.");
    } catch {
      setMessage("We could not create the export. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteData() {
    setBusy(true);
    setMessage(null);
    try {
      await apiClient.deleteAccount(userId);
      setMessage("Your account data was deleted.");
      setConfirmDelete(false);
    } catch {
      setMessage("We could not delete your data. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button disabled={busy} onClick={exportData} type="button" variant="outline">
          Export my data
        </Button>
        <Button disabled={busy} onClick={() => setConfirmDelete(true)} type="button" variant="destructive">
          Delete my data
        </Button>
      </div>
      {confirmDelete ? (
        <div className="space-y-3 rounded-md border border-destructive/40 p-4" role="alert">
          <p className="text-sm">This permanently deletes your roadmap progress, preferences, and history.</p>
          <div className="flex gap-3">
            <Button disabled={busy} onClick={deleteData} type="button" variant="destructive">Confirm deletion</Button>
            <Button disabled={busy} onClick={() => setConfirmDelete(false)} type="button" variant="ghost">Cancel</Button>
          </div>
        </div>
      ) : null}
      {message ? <p aria-live="polite" className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
