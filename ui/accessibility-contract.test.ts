import { describe, expect, test } from "bun:test";

async function source(path: string) {
  return Bun.file(path).text();
}

describe("todo_11 responsive and accessibility contracts", () => {
  test("roadmap routes expose main landmarks and recovery announcements", async () => {
    const now = await source("app/now/page.tsx");
    const horizon = await source("app/horizon/page.tsx");
    const states = await source("components/feedback/route-state.tsx");
    expect(now).toContain('id="main-content"');
    expect(horizon).toContain('id="main-content"');
    expect(now).toContain('aria-live="polite"');
    expect(horizon).toContain('aria-live="polite"');
    expect(states).toContain('aria-busy="true"');
  });

  test("interactive recovery controls have accessible names and dialog wiring", async () => {
    const ask = await source("components/ask-sheet.tsx");
    const settings = await source(
      "features/enrollment/components/context-settings.tsx",
    );
    const details = await source(
      "features/roadmap/components/roadmap-detail-sheet.tsx",
    );
    expect(ask).toContain("Retry question");
    expect(settings).toContain("Retry loading context");
    expect(details).toContain('aria-describedby="roadmap-detail-description"');
    expect(details).toContain('aria-labelledby="roadmap-detail-title"');
  });

  test("responsive and motion-safe design contracts remain present", async () => {
    const styles = await source("app/globals.css");
    const horizon = await source("app/horizon/page.tsx");
    const design = await source("DESIGN.md");
    expect(styles).toContain("prefers-reduced-motion: reduce");
    expect(horizon).toContain("md:grid-cols-2");
    expect(design).toContain("WCAG 2.1 AA");
    expect(design).toContain("margin-mobile: 16px");
    expect(design).toContain("margin-desktop: 40px");
  });
});
