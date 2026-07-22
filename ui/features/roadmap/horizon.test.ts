import { describe, expect, test } from "bun:test";
import { horizonGroupLabel } from "./horizon";

describe("horizonGroupLabel", () => {
  test("labels the first month as soon", () => {
    expect(horizonGroupLabel(30)).toBe("Soon");
  });

  test("labels later time markers as later", () => {
    expect(horizonGroupLabel(31)).toBe("Later");
  });
});

test("labels stale citation evidence in Horizon", async () => {
  const source = await Bun.file("app/horizon/page.tsx").text();
  expect(source).toContain("Source review due");
  expect(source).toContain("card.citation_stale");
});

test("surfaces Horizon citation links in the detail dialog", async () => {
  const source = await Bun.file("app/horizon/page.tsx").text();
  expect(source).toContain("selectedCard.citation_title");
  expect(source).toContain("selectedCard.citation_url");
  expect(source).toContain('rel="noreferrer"');
});
