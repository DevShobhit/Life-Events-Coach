import { describe, expect, test } from "bun:test";
import {
  isApplicationServiceWorkerCache,
  isServiceWorkerResetRequested,
} from "./service-worker-recovery";

describe("service-worker recovery policy", () => {
  test("requires an explicit development reset query", () => {
    expect(isServiceWorkerResetRequested("?reset_sw=1")).toBe(true);
    expect(isServiceWorkerResetRequested("?reset_sw=0")).toBe(false);
    expect(isServiceWorkerResetRequested("?reset_sw=1&ask=1")).toBe(true);
  });

  test("limits cache deletion to this application", () => {
    expect(isApplicationServiceWorkerCache("livecoach-shell-v2")).toBe(true);
    expect(isApplicationServiceWorkerCache("other-app-shell-v1")).toBe(false);
  });
});
