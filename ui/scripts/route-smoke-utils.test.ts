import { describe, expect, test } from "bun:test";
import { classifyRouteResponse } from "./route-smoke-utils";

describe("route smoke response classification", () => {
  test("rejects generic framework error pages even when the HTTP status is successful", () => {
    const result = classifyRouteResponse(
      200,
      "text/html",
      "<main>Application error: failed to load</main>",
      /<main>/,
    );
    expect(result.ok).toBe(false);
    expect(result.genericErrorPage).toBe(true);
  });

  test("reports content type and accepts a healthy route shell", () => {
    const result = classifyRouteResponse(
      200,
      "text/html; charset=utf-8",
      "<main>Your next steady step</main>",
      /Your next steady step/,
    );
    expect(result).toEqual({
      contentType: "text/html; charset=utf-8",
      genericErrorPage: false,
      markerFound: true,
      ok: true,
    });
  });

  test("accepts the editorial workspace shell", () => {
    const result = classifyRouteResponse(
      200,
      "text/html; charset=utf-8",
      "<main><h1>Shape the curriculum.</h1></main>",
      /Shape the curriculum\./,
    );
    expect(result.ok).toBe(true);
    expect(result.markerFound).toBe(true);
  });
});
