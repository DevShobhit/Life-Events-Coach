import { describe, expect, test } from "bun:test";

const source = await Bun.file("components/offline-sync.tsx").text();

describe("service worker registration lifecycle", () => {
  test("observes worker state changes and removes listeners on cleanup", () => {
    expect(source).toContain("statechange");
    expect(source).toContain('removeEventListener("statechange"');
    expect(source).toContain("service_worker.state.changed");
  });

  test("reports replay failures without leaving an unhandled promise", () => {
    expect(source).toContain("offline.replay.failed");
    expect(source).toContain("replayWithDiagnostics");
    expect(source).toContain("removeEventListener(\"online\", replayWithDiagnostics)");
  });

  test("uses the structured service-worker lifecycle event names", () => {
    for (const event of [
      "service_worker.registration.started",
      "service_worker.registration.completed",
      "service_worker.registration.failed",
      "service_worker.update.available",
      "service_worker.controller.changed",
      "service_worker.update.failed",
    ]) {
      expect(source).toContain(event);
    }
  });

  test("reports explicit reset failures without an unhandled rejection", () => {
    expect(source).toContain("service_worker.reset.failed");
    expect(source).toContain("resetApplicationServiceWorker()");
    expect(source).toContain(".then(() =>");
  });

  test("keeps registration and reset failures visible in production logs", () => {
    expect(source).toContain("logServiceWorkerFailure");
    expect(source).toContain('"service_worker.registration.failed"');
    expect(source).toContain('"service_worker.reset.failed"');
  });
});
