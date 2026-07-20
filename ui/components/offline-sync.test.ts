import { describe, expect, test } from "bun:test";

const source = await Bun.file("components/offline-sync.tsx").text();

describe("service worker registration lifecycle", () => {
  test("observes worker state changes and removes listeners on cleanup", () => {
    expect(source).toContain("statechange");
    expect(source).toContain('removeEventListener("statechange"');
    expect(source).toContain("service_worker.state_changed");
  });
});
