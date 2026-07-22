import { describe, expect, test } from "bun:test";
import {
  isTransientQueryError,
  queryClient,
  ROADMAP_QUERY_STALE_TIME_MS,
} from "./query-client";

describe("query policy", () => {
  test("recognizes transient HTTP errors", () => {
    expect(
      isTransientQueryError(Object.assign(new Error("busy"), { status: 503 })),
    ).toBe(true);
    expect(
      isTransientQueryError(Object.assign(new Error("bad"), { status: 400 })),
    ).toBe(false);
  });

  test("keeps roadmap reads fresh briefly to avoid route-toggle refetches", () => {
    expect(ROADMAP_QUERY_STALE_TIME_MS).toBe(30_000);
  });

  test("does not refetch every stale query on network reconnect", () => {
    expect(queryClient.getDefaultOptions().queries?.refetchOnReconnect).toBe(
      false,
    );
  });
});
