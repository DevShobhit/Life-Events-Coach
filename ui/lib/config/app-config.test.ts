import { describe, expect, test } from "bun:test";
import { browserDefaultApiUrl } from "./app-config";

describe("browser API configuration", () => {
  test("uses localhost during non-browser execution", () => {
    expect(browserDefaultApiUrl()).toBe("http://localhost:8000");
  });
});
