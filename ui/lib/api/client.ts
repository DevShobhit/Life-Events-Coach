import { appConfig } from "@/lib/config/app-config";
import { apiLogger } from "@/lib/logging/logger";
import { ApiError } from "./errors";
import type {
  AskResponse,
  CardAction,
  Enrollment,
  PublishedPhaseModule,
  RoadmapResponse,
} from "./types";
import { isRoadmapResponse } from "./types";

type ClientOptions = {
  baseUrl?: string;
  fetcher?: typeof fetch;
};

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  userId?: string;
};

export class LifeCurriculumClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  constructor(options: ClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? appConfig.apiUrl;
    const fetchImplementation = options.fetcher ?? globalThis.fetch;
    const fetchReceiver = typeof window === "undefined" ? globalThis : window;
    this.fetcher = (input, init) =>
      Reflect.apply(fetchImplementation, fetchReceiver, [input, init]);
  }

  phases(signal?: AbortSignal) {
    return this.request<PublishedPhaseModule[]>("/phases", { signal });
  }

  roadmap(
    userId: string,
    phaseId: string,
    stage = "arrived",
    signal?: AbortSignal,
  ) {
    return this.request<RoadmapResponse>(
      `/roadmap/${encodeURIComponent(userId)}/${encodeURIComponent(phaseId)}?stage=${encodeURIComponent(stage)}`,
      { userId, signal },
    ).then((roadmap) => this.validateRoadmapResponse(roadmap));
  }

  action(
    userId: string,
    phaseId: string,
    payload: {
      concern_id: string;
      action: CardAction;
      stage?: string;
      idempotency_key: string;
    },
    signal?: AbortSignal,
  ) {
    return this.request<RoadmapResponse>(
      `/roadmap/${encodeURIComponent(userId)}/${encodeURIComponent(phaseId)}/actions`,
      { userId, method: "POST", body: payload, signal },
    ).then((roadmap) => this.validateRoadmapResponse(roadmap));
  }

  ask(userId: string, phaseId: string, question: string, signal?: AbortSignal) {
    return this.request<AskResponse>(
      `/ask/${encodeURIComponent(userId)}/${encodeURIComponent(phaseId)}`,
      {
        userId,
        method: "POST",
        body: { question },
        signal,
      },
    );
  }

  fold(
    userId: string,
    phaseId: string,
    concernId: string,
    idempotencyKey: string,
    stage = "arrived",
    signal?: AbortSignal,
  ) {
    return this.request<RoadmapResponse>(
      `/ask/${encodeURIComponent(userId)}/${encodeURIComponent(phaseId)}/roadmap-folds/${encodeURIComponent(concernId)}`,
      {
        userId,
        method: "POST",
        body: {
          confirm: true,
          stage,
          idempotency_key: idempotencyKey,
        },
        signal,
      },
    );
  }

  saveEnrollment(
    userId: string,
    phaseId: string,
    context: Record<string, string>,
  ) {
    return this.request<Enrollment>(
      `/enrollment/${encodeURIComponent(userId)}/${encodeURIComponent(phaseId)}`,
      { userId, method: "PUT", body: { context } },
    );
  }

  enrollment(userId: string, phaseId: string, signal?: AbortSignal) {
    return this.request<Enrollment>(
      `/enrollment/${encodeURIComponent(userId)}/${encodeURIComponent(phaseId)}`,
      { userId, signal },
    );
  }

  private async request<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const requestId = crypto.randomUUID();
    const { userId, ...requestInit } = options;
    const method = requestInit.method ?? "GET";
    const logPath = redactPath(path);
    const startedAt = performance.now();
    apiLogger.debug("api_request_started", {
      method,
      path: logPath,
      requestId,
    });
    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}${path}`, {
        ...requestInit,
        body: requestInit.body ? JSON.stringify(requestInit.body) : undefined,
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": requestId,
          ...(userId ? { "X-User-ID": userId } : {}),
          ...requestInit.headers,
        },
      });
    } catch (error) {
      apiLogger.warn("api_request_failed", {
        method,
        path: logPath,
        targetOrigin: this.baseUrl,
        requestId,
        durationMs: Math.round(performance.now() - startedAt),
        errorType: error instanceof Error ? error.name : "unknown",
      });
      throw error;
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: { code?: string; request_id?: string | null };
      } | null;
      apiLogger.warn("api_request_failed", {
        method,
        path: logPath,
        requestId,
        status: response.status,
        durationMs: Math.round(performance.now() - startedAt),
        errorCode: body?.error?.code ?? "http_error",
      });
      throw new ApiError(
        body?.error?.code ?? "http_error",
        body?.error?.request_id ?? response.headers.get("X-Request-ID"),
        response.status,
      );
    }

    apiLogger.debug("api_request_succeeded", {
      method,
      path: logPath,
      requestId,
      status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
    });
    return (await response.json()) as T;
  }

  private validateRoadmapResponse(response: RoadmapResponse): RoadmapResponse {
    if (!isRoadmapResponse(response)) {
      throw new ApiError("invalid_response", null, 502);
    }
    return response;
  }
}

function redactPath(path: string): string {
  return path
    .replace(/^(\/(?:roadmap|ask|enrollment))\/[^/]+/, "$1/:user")
    .replace(/\/roadmap-folds\/[^/]+$/, "/roadmap-folds/:concern");
}

export const apiClient = new LifeCurriculumClient();
