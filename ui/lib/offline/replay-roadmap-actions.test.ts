import { describe, expect, test } from "bun:test";
import { replayQueuedRoadmapActions } from "./replay-roadmap-actions";
import type { QueuedAction } from "./roadmap-cache";

function action(input: Partial<QueuedAction> = {}): QueuedAction {
  return {
    userId: "user",
    phaseId: "phase",
    stage: "arrived",
    concernId: "concern",
    action: "done",
    idempotencyKey: crypto.randomUUID(),
    ...input,
  };
}

describe("replayQueuedRoadmapActions", () => {
  test("refreshes each affected roadmap once after successful replay", async () => {
    const refreshed: string[] = [];
    const submitted: string[] = [];
    const queued = [
      action({ concernId: "first" }),
      action({ concernId: "second" }),
      action({ phaseId: "other", concernId: "third" }),
    ];

    await replayQueuedRoadmapActions({
      replay: async (execute) => {
        for (const queuedAction of queued) await execute(queuedAction);
      },
      submit: async (queuedAction) => {
        submitted.push(queuedAction.concernId);
      },
      refresh: async (userId, phaseId) => {
        refreshed.push(`${userId}:${phaseId}`);
      },
    });

    expect(submitted).toEqual(["first", "second", "third"]);
    expect(refreshed).toEqual(["user:phase", "user:other"]);
  });

  test("does not refresh roadmaps whose only replayed action failed", async () => {
    const refreshed: string[] = [];
    const queued = [
      action({ concernId: "first" }),
      action({ phaseId: "other", concernId: "second" }),
    ];

    await replayQueuedRoadmapActions({
      replay: async (execute) => {
        for (const queuedAction of queued) {
          try {
            await execute(queuedAction);
          } catch {
            // The real store retains failed actions and continues replay.
          }
        }
      },
      submit: async (queuedAction) => {
        if (queuedAction.concernId === "second") throw new Error("offline");
      },
      refresh: async (userId, phaseId) => {
        refreshed.push(`${userId}:${phaseId}`);
      },
    });

    expect(refreshed).toEqual(["user:phase"]);
  });
});
