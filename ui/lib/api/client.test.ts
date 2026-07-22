import { describe, expect, test } from "bun:test";

import { apiOriginForDiagnostics, LifeCurriculumClient } from "./client";
import { ApiError } from "./errors";

describe("LifeCurriculumClient", () => {
  test("redacts API diagnostics to the origin", () => {
    expect(
      apiOriginForDiagnostics(
        "https://user:secret@api.example.test/private?token=secret",
      ),
    ).toBe("https://api.example.test");
    expect(apiOriginForDiagnostics("not-a-url")).toBe("invalid-origin");
  });

  test("loads only active enrollments for phase switching", async () => {
    const requests: Request[] = [];
    const client = new LifeCurriculumClient({
      baseUrl: "https://api.example.test",
      fetcher: async (input, init) => {
        requests.push(new Request(input, init));
        return Response.json([
          {
            user_id: "local-dev-user",
            phase_id: "relocation",
            context: { relocation_stage: "arrived" },
            progress_anchor: "2026-07-21",
            status: "active",
            completed_at: null,
            archived_at: null,
          },
        ]);
      },
    });

    await client.activeEnrollments("local-dev-user");

    expect(requests[0]?.url).toBe(
      "https://api.example.test/enrollment/local-dev-user",
    );
    expect(requests[0]?.headers.get("X-User-ID")).toBe("local-dev-user");
  });

  test("uses bearer credentials for provider-backed requests", async () => {
    let request: Request | undefined;
    const client = new LifeCurriculumClient({
      baseUrl: "https://api.example.test",
      getAccessToken: () => "signed-token",
      fetcher: async (input, init) => {
        request = new Request(input, init);
        return Response.json([]);
      },
    });

    await client.activeEnrollments("provider-subject");

    expect(request?.headers.get("Authorization")).toBe("Bearer signed-token");
    expect(request?.headers.get("X-User-ID")).toBeNull();
  });

  test("loads editorial versions and freshness for the selected phase", async () => {
    const requests: Request[] = [];
    const client = new LifeCurriculumClient({
      baseUrl: "https://api.example.test",
      fetcher: async (input, init) => {
        requests.push(new Request(input, init));
        return String(input).includes("freshness")
          ? Response.json({
              phase_id: "relocation",
              version: 3,
              as_of: "2026-07-21",
              freshness_days: 30,
              stale_count: 1,
              items: [],
            })
          : Response.json([
              {
                phase_id: "relocation",
                version: 3,
                status: "active",
                module: {},
              },
            ]);
      },
    });

    await client.editorialVersions("relocation", "editor");
    await client.editorialFreshness("relocation");
    await client.editorialPreview("relocation", "draft-1", "editor");
    await client.editorialDraft("relocation", "draft-1", "editor");
    await client.rollbackEditorialVersion("relocation", 1, 2, "admin");

    expect(requests[0]?.url).toContain("/editorial/phases/relocation/versions");
    expect(requests[0]?.headers.get("X-User-Role")).toBe("editor");
    expect(requests[1]?.url).toContain("/editorial/freshness/relocation");
    expect(requests[2]?.url).toContain(
      "/editorial/phases/relocation/drafts/draft-1/preview",
    );
    expect(requests[3]?.url).toContain(
      "/editorial/phases/relocation/drafts/draft-1",
    );
    expect(requests[4]?.method).toBe("POST");
    expect(requests[4]?.url).toContain("/versions/1/rollback");
    expect(requests[4]?.headers.get("X-User-Role")).toBe("admin");
  });

  test("uses role-scoped editorial draft and publish endpoints", async () => {
    const requests: Request[] = [];
    const client = new LifeCurriculumClient({
      baseUrl: "https://api.example.test",
      fetcher: async (input, init) => {
        requests.push(new Request(input, init));
        if (String(input).includes("/drafts")) {
          return Response.json({
            draft_id: "draft-1",
            phase_id: "relocation",
            base_version: 1,
            status: "draft",
            revision: 1,
            module: { schema_version: "1.0", phase_id: "relocation" },
            validation_report: null,
            published_version: null,
          });
        }
        return Response.json([]);
      },
    });

    await client.editorialDrafts("relocation", "editor");
    await client.createEditorialDraft("relocation", "editor", {
      schema_version: "1.0",
      phase_id: "relocation",
      source_policy: ["government_portal"],
      onboarding_fields: [],
      concerns: [],
    });

    expect(requests[0]?.headers.get("X-User-Role")).toBe("editor");
    expect(requests[1]?.method).toBe("POST");
    expect(requests[1]?.url).toContain("/editorial/phases/relocation/drafts");
  });
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

  test("reads and saves notification preferences through the user scope", async () => {
    const requests: Request[] = [];
    const client = new LifeCurriculumClient({
      baseUrl: "https://api.example.test",
      fetcher: async (input, init) => {
        requests.push(new Request(input, init));
        return Response.json({
          user_id: "dev-user",
          enabled: true,
          timezone: "UTC",
          local_time: "09:00:00",
          delivery_status: "not_configured",
          last_delivery_at: null,
        });
      },
    });

    await client.notificationPreferences("dev-user");
    await client.saveNotificationPreferences("dev-user", {
      enabled: true,
      timezone: "UTC",
      local_time: "09:00:00",
    });

    expect(requests[0]?.url).toContain("/notifications/preferences/dev-user");
    expect(requests[0]?.headers.get("X-User-ID")).toBe("dev-user");
    expect(requests[1]?.method).toBe("PUT");
    expect(await requests[1]?.json()).toEqual({
      enabled: true,
      timezone: "UTC",
      local_time: "09:00:00",
    });
  });

  test("uses explicit enrollment lifecycle endpoints and history", async () => {
    const requests: Request[] = [];
    const client = new LifeCurriculumClient({
      baseUrl: "https://api.example.test",
      fetcher: async (input, init) => {
        requests.push(new Request(input, init));
        if (String(input).endsWith("/history")) return Response.json([]);
        return Response.json({
          user_id: "dev-user",
          phase_id: "relocation",
          context: {},
          progress_anchor: "2026-07-21",
          status: "completed",
          completed_at: "2026-07-21T09:00:00Z",
          archived_at: null,
        });
      },
    });

    await client.completeEnrollment("dev-user", "relocation");
    await client.archiveEnrollment("dev-user", "relocation");
    await client.enrollmentHistory("dev-user");

    expect(requests.map((request) => request.method)).toEqual([
      "POST",
      "POST",
      "GET",
    ]);
    expect(requests[0]?.url).toContain("/complete");
    expect(requests[1]?.url).toContain("/archive");
    expect(requests[2]?.url).toContain("/history");
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

  test("maps authentication-required responses to safe session recovery", async () => {
    const client = new LifeCurriculumClient({
      fetcher: async () =>
        Response.json(
          {
            error: {
              code: "authentication_required",
              message: "internal auth details",
              request_id: "req-auth",
            },
          },
          { status: 401 },
        ),
    });

    await expect(
      client.roadmap("dev-user", "relocation"),
    ).rejects.toMatchObject({
      code: "authentication_required",
      requestId: "req-auth",
      status: 401,
      message: "Your session has expired. Please sign in again.",
    });
  });

  test("maps rate limits to retryable safe recovery", async () => {
    const client = new LifeCurriculumClient({
      fetcher: async () =>
        Response.json(
          { error: { code: "rate_limited", request_id: "req-limit" } },
          { status: 429, headers: { "Retry-After": "1" } },
        ),
    });

    await expect(
      client.roadmap("dev-user", "relocation"),
    ).rejects.toMatchObject({
      code: "rate_limited",
      requestId: "req-limit",
      status: 429,
      message: "Too many requests right now. Please wait and retry.",
    });
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
