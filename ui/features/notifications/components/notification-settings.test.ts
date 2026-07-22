import { describe, expect, test } from "bun:test";

describe("notification settings contract", () => {
  test("provides retry, save, and delivery-status recovery affordances", async () => {
    const source = await Bun.file(
      "features/notifications/components/notification-settings.tsx",
    ).text();

    expect(source).toContain("Retry notification preferences");
    expect(source).toContain("Save notification preferences");
    expect(source).toContain("delivery_status");
    expect(source).toContain("aria-live");
  });
});
