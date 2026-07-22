import { describe, expect, test } from "bun:test";
import {
  type AuthenticatedSession,
  configureSessionAdapter,
  getConfiguredSessionAdapter,
} from "./session";

describe("provider-neutral session adapter", () => {
  test("exposes provider snapshots and cleanup contract", () => {
    let listener: ((session: AuthenticatedSession | null) => void) | undefined;
    let cleaned = false;
    const adapter = {
      subscribe: (next: (session: AuthenticatedSession | null) => void) => {
        listener = next;
        return () => {
          cleaned = true;
        };
      },
    };

    configureSessionAdapter(adapter);
    expect(getConfiguredSessionAdapter()).toBe(adapter);
    listener?.({ userId: "user-a", accessToken: "token-a" });
    listener?.(null);
    getConfiguredSessionAdapter()?.subscribe(() => {})();
    configureSessionAdapter(null);

    expect(cleaned).toBe(true);
    expect(getConfiguredSessionAdapter()).toBeNull();
  });
});
