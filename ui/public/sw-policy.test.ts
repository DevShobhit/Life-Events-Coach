import { describe, expect, test } from "bun:test";

const source = await Bun.file("public/sw.js").text();

describe("service worker cache policy", () => {
  test("uses a versioned application cache and removes obsolete versions", () => {
    expect(source).toContain('const CACHE_PREFIX = "livecoach-shell-"');
    expect(source).toContain("name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME");
  });

  test("limits interception to same-origin documents and static assets", () => {
    expect(source).toContain('request.method !== "GET"');
    expect(source).toContain("!isSameOrigin(request)");
    expect(source).toContain('request.destination === "document"');
    expect(source).toContain("isCacheableAsset(request)");
  });

  test("does not cache API or mutation traffic", () => {
    expect(source).toContain('request.method !== "GET"');
    expect(source).not.toContain("cache.put(request, response.clone())`); // API");
  });
});
