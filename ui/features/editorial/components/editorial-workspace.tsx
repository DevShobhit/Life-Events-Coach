"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type {
  EditorialDraft,
  EditorialFreshness,
  EditorialVersion,
  PhaseModule,
  PublishedPhaseModule,
} from "@/lib/api/types";

type EditorialRole = "editor" | "publisher" | "admin";

const role = (process.env.NEXT_PUBLIC_EDITORIAL_ROLE ??
  "editor") as EditorialRole;

export function EditorialWorkspace() {
  const [phases, setPhases] = useState<PublishedPhaseModule[]>([]);
  const [phaseId, setPhaseId] = useState("");
  const [drafts, setDrafts] = useState<EditorialDraft[]>([]);
  const [draft, setDraft] = useState<EditorialDraft | null>(null);
  const [versions, setVersions] = useState<EditorialVersion[]>([]);
  const [freshness, setFreshness] = useState<EditorialFreshness | null>(null);
  const [editorText, setEditorText] = useState("");
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedPhase = useMemo(
    () => phases.find((phase) => phase.module.phase_id === phaseId),
    [phases, phaseId],
  );

  useEffect(() => {
    void apiClient
      .phases()
      .then((items) => {
        setPhases(items);
        setPhaseId(items[0]?.module.phase_id ?? "");
      })
      .catch(() => setMessage("Editorial phases could not be loaded."));
  }, []);

  useEffect(() => {
    if (!phaseId) return;
    setVersions([]);
    setFreshness(null);
    void apiClient
      .editorialDrafts(phaseId, role)
      .then(setDrafts)
      .catch(() => setMessage("Drafts could not be loaded."));
    void apiClient
      .editorialVersions(phaseId, role)
      .then(setVersions)
      .catch(() => setMessage("Published versions could not be loaded."));
    void apiClient
      .editorialFreshness(phaseId)
      .then(setFreshness)
      .catch(() => setMessage("Citation freshness could not be loaded."));
  }, [phaseId]);

  function selectDraft(next: EditorialDraft) {
    setDraft(next);
    setEditorText(JSON.stringify(next.module, null, 2));
    setPreviewText(null);
    setMessage(null);
  }

  async function createDraft() {
    if (!selectedPhase) return;
    setBusy(true);
    setMessage(null);
    try {
      const next = await apiClient.createEditorialDraft(
        phaseId,
        role,
        selectedPhase.module,
      );
      setDrafts((current) => [next, ...current]);
      selectDraft(next);
    } catch {
      setMessage(
        "Draft could not be created. Check the phase content and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!draft) return;
    setBusy(true);
    setMessage(null);
    try {
      const module = JSON.parse(editorText) as PhaseModule;
      const next = await apiClient.updateEditorialDraft(
        phaseId,
        draft.draft_id,
        role,
        module,
        draft.revision,
      );
      setDraft(next);
      setDrafts((current) =>
        current.map((item) => (item.draft_id === next.draft_id ? next : item)),
      );
      setEditorText(JSON.stringify(next.module, null, 2));
      setMessage("Draft saved.");
    } catch (error) {
      setMessage(
        error instanceof SyntaxError
          ? "Draft JSON is invalid."
          : error instanceof ApiError && error.code === "conflict"
            ? "This draft changed elsewhere. Reload it before saving again."
          : "Draft could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function previewDraft() {
    if (!draft) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await apiClient.editorialPreview(
        phaseId,
        draft.draft_id,
        role,
      );
      setPreviewText(JSON.stringify(result.module, null, 2));
      setMessage("Preview generated from the saved draft.");
    } catch (error) {
      setMessage(
        error instanceof ApiError && error.code === "conflict"
          ? "Preview is out of date. Reload the draft and try again."
          : "Preview could not be generated. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function validateDraft() {
    if (!draft) return;
    setBusy(true);
    try {
      const result = await apiClient.validateEditorialDraft(
        phaseId,
        draft.draft_id,
        role,
      );
      setMessage(
        result.valid
          ? "Draft is ready for review."
          : "Draft needs changes before publishing.",
      );
    } catch {
      setMessage("Draft validation failed. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  async function publishDraft() {
    if (!draft || (role !== "publisher" && role !== "admin")) return;
    setBusy(true);
    try {
      const result = await apiClient.publishEditorialDraft(
        phaseId,
        draft.draft_id,
        role,
        draft.base_version,
        crypto.randomUUID(),
      );
      setMessage(`Published version ${result.version}.`);
      setDraft({
        ...draft,
        status: "published",
        published_version: result.version,
      });
    } catch {
      setMessage("Publish failed. The active version was not changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6" aria-label="Editorial workspace">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          Phase
          <select
            className="h-10 rounded-md border border-border bg-background px-3"
            value={phaseId}
            onChange={(event) => setPhaseId(event.target.value)}
          >
            {phases.map((phase) => (
              <option key={phase.module.phase_id} value={phase.module.phase_id}>
                {phase.module.display_name ?? phase.module.phase_id}
              </option>
            ))}
          </select>
        </label>
        <Button
          disabled={!selectedPhase || busy}
          onClick={() => void createDraft()}
          type="button"
        >
          New draft
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
        <div aria-label="Draft list" className="space-y-2" role="list">
          {drafts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No drafts yet.</p>
          ) : (
            drafts.map((item) => (
              <Button
                className="w-full justify-start"
                key={item.draft_id}
                onClick={() => selectDraft(item)}
                type="button"
                variant={
                  draft?.draft_id === item.draft_id ? "secondary" : "ghost"
                }
              >
                {item.status} · r{item.revision}
              </Button>
            ))
          )}
          <div className="mt-6 border-t border-border pt-4 text-sm">
            <h2 className="font-medium">Published versions</h2>
            {versions.length === 0 ? (
              <p className="mt-2 text-muted-foreground">No published versions.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {versions.map((item) => (
                  <li key={item.version}>
                    v{item.version} · {item.status}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div
            aria-label="Citation freshness"
            className="rounded-md border border-border p-4 text-sm"
          >
            <h2 className="font-medium">Citation freshness</h2>
            {freshness ? (
              <p className="mt-1 text-muted-foreground">
                Version {freshness.version}: {freshness.stale_count} stale of {freshness.items.length} citations
                (review every {freshness.freshness_days} days).
              </p>
            ) : (
              <p className="mt-1 text-muted-foreground">Freshness data unavailable.</p>
            )}
          </div>
          {draft ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Draft {draft.draft_id} · revision {draft.revision}
                </p>
                <div className="flex gap-2">
                  <Button
                    disabled={busy}
                    onClick={() => void saveDraft()}
                    type="button"
                    variant="outline"
                  >
                    Save
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() => void validateDraft()}
                    type="button"
                    variant="outline"
                  >
                    Validate
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() => void previewDraft()}
                    type="button"
                    variant="outline"
                  >
                    Preview
                  </Button>
                  {role === "publisher" || role === "admin" ? (
                    <Button
                      disabled={busy || draft.status === "published"}
                      onClick={() => void publishDraft()}
                      type="button"
                    >
                      Publish
                    </Button>
                  ) : null}
                </div>
              </div>
              <label className="grid gap-2 text-sm">
                Module JSON
                <textarea
                  aria-label="Draft module JSON"
                  className="min-h-[28rem] rounded-md border border-border bg-background p-3 font-mono text-xs"
                  value={editorText}
                  onChange={(event) => setEditorText(event.target.value)}
                />
              </label>
              {previewText ? (
                <label className="grid gap-2 text-sm">
                  Saved preview
                  <textarea
                    aria-label="Saved draft preview"
                    className="min-h-[18rem] rounded-md border border-border bg-muted/30 p-3 font-mono text-xs"
                    readOnly
                    value={previewText}
                  />
                </label>
              ) : null}
            </>
          ) : (
            <p className="rounded-md border border-dashed border-border p-8 text-sm text-muted-foreground">
              Select or create a draft to begin editing.
            </p>
          )}
          {message ? (
            <p
              aria-live="polite"
              className="text-sm text-muted-foreground"
              role="status"
            >
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
