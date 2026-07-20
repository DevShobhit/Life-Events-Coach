import { describe, expect, test } from "bun:test";

import { LifeCurriculumClient } from "./client";
import { ApiError } from "./errors";

describe("LifeCurriculumClient", () => {
  test("reads the published phase catalog with configured onboarding fields", async () => {
    const client = new LifeCurriculumClient({
      baseUrl: "https://api.example.test",
      fetcher: async () =>
        Response.json([
          {
            version: 1,
            module: {
              schema_version: "1.0",
              phase_id: "relocation",
              onboarding_fields: ["relocation_stage"],
              thresholds: { skip_count_for_relevance_check: 2 },
            },
          },
        ]),
    });

    await expect(client.phases()).resolves.toEqual([
      expect.objectContaining({
        version: 1,
        module: expect.objectContaining({
          phase_id: "relocation",
          onboarding_fields: ["relocation_stage"],
        }),
      }),
    ]);
  });

  test("sends scoped roadmap requests with a request id", async () => {
    const requests: Request[] = [];
    const client = new LifeCurriculumClient({
      baseUrl: "https://api.example.test",
      fetcher: async (input, init) => {
        requests.push(new Request(input, init));
        return Response.json({
          phase_id: "relocation",
          version: 1,
          now: [],
          current: null,
          horizon: [],
        });
      },
    });

    await client.roadmap("dev-user", "relocation", "arrived");

    expect(requests[0]?.url).toBe(
      "https://api.example.test/roadmap/dev-user/relocation?stage=arrived",
    );
    expect(requests[0]?.headers.get("X-User-ID")).toBe("dev-user");
    expect(requests[0]?.headers.get("X-Request-ID")).toBeString();
  });

  test("serializes idempotent action payloads", async () => {
    let request: Request | undefined;
    const client = new LifeCurriculumClient({
      baseUrl: "https://api.example.test",
      fetcher: async (input, init) => {
        request = new Request(input, init);
        return Response.json({
          phase_id: "relocation",
          version: 1,
          now: [],
          current: null,
          horizon: [],
        });
      },
    });

    await client.action("dev-user", "relocation", {
      concern_id: "housing",
      action: "done",
      idempotency_key: "request-1",
    });

    expect(await request?.json()).toEqual({
      concern_id: "housing",
      action: "done",
      idempotency_key: "request-1",
    });
  });

  test("maps server error codes without exposing raw messages", async () => {
    const client = new LifeCurriculumClient({
      fetcher: async () =>
        Response.json(
          {
            error: {
              code: "dependency_unavailable",
              message: "internal storage details",
              request_id: "req-1",
            },
          },
          { status: 503 },
        ),
    });

    const result = client.roadmap("dev-user", "relocation");

    await expect(result).rejects.toBeInstanceOf(ApiError);
    await expect(result).rejects.toMatchObject({
      code: "dependency_unavailable",
      requestId: "req-1",
      status: 503,
    });
    await expect(result).rejects.not.toHaveProperty(
      "message",
      "internal storage details",
    );
  });

  test("rejects malformed roadmap data with safe typed error", async () => {
    const client = new LifeCurriculumClient({
      fetcher: async () =>
        Response.json({ phase_id: "relocation", version: 1, now: [] }),
    });

    await expect(
      client.roadmap("dev-user", "relocation"),
    ).rejects.toMatchObject({
      code: "invalid_response",
      status: 502,
    });
  });

  test("does not retry transient read failures inside the API client", async () => {
    let attempts = 0;
    const client = new LifeCurriculumClient({
      fetcher: async () => {
        attempts += 1;
        return Response.json(
          { error: { code: "dependency_unavailable", request_id: "req-1" } },
          { status: 503 },
        );
      },
    });

    await expect(
      client.roadmap("dev-user", "relocation"),
    ).rejects.toMatchObject({
      status: 503,
    });

    expect(attempts).toBe(1);
  });

  test("logs redacted route paths when transport requests fail", async () => {
    const fetcher = async () => {
      throw new TypeError("network unavailable");
    };
    const client = new LifeCurriculumClient({
      baseUrl: "https://api.example.test",
      fetcher,
    });

    await expect(client.roadmap("private-user", "relocation")).rejects.toThrow(
      "network unavailable",
    );
  });

  test("invokes a receiver-sensitive fetch implementation with globalThis", async () => {
    const fetcher = function (
      this: typeof globalThis,
      input: RequestInfo | URL,
    ) {
      expect(this).toBe(globalThis);
      expect(String(input)).toContain("/phases");
      return Promise.resolve(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    };
    const client = new LifeCurriculumClient({
      baseUrl: "https://api.example.test",
      fetcher,
    });

    await expect(client.phases()).resolves.toEqual([]);
  });

  test("invokes the default fetch implementation with its global receiver", async () => {
    const originalFetch = globalThis.fetch;
    let receiver: typeof globalThis | undefined;
    globalThis.fetch = function (
      this: typeof globalThis,
      input: RequestInfo | URL,
    ) {
      receiver = this;
      expect(String(input)).toContain("/phases");
      return Promise.resolve(Response.json([]));
    };

    try {
      const client = new LifeCurriculumClient({
        baseUrl: "https://api.example.test",
      });

      await expect(client.phases()).resolves.toEqual([]);
      expect(receiver).toBe(globalThis);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
