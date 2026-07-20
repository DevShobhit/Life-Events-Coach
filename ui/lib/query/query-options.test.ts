import { describe, expect, test } from "bun:test";
import { isTransientQueryError } from "./query-client";

describe("query policy", () => {
  test("recognizes transient HTTP errors", () => {
    expect(
      isTransientQueryError(Object.assign(new Error("busy"), { status: 503 })),
    ).toBe(true);
    expect(
      isTransientQueryError(Object.assign(new Error("bad"), { status: 400 })),
    ).toBe(false);
  });
});
