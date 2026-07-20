import { appConfig } from "@/lib/config/app-config";
import { ApiError } from "./errors";
import type {
  AskResponse,
  CardAction,
  Enrollment,
  RoadmapResponse,
} from "./types";

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
    this.fetcher = options.fetcher ?? fetch;
  }

  roadmap(
    userId: string,
    phaseId: string,
    stage = "arrived",
    signal?: AbortSignal,
  ) {
    return this.withRetry(
      () =>
        this.request<RoadmapResponse>(
          `/roadmap/${encodeURIComponent(userId)}/${encodeURIComponent(phaseId)}?stage=${encodeURIComponent(stage)}`,
          { userId, signal },
        ),
      signal,
    );
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
    return this.withRetry(
      () =>
        this.request<RoadmapResponse>(
          `/roadmap/${encodeURIComponent(userId)}/${encodeURIComponent(phaseId)}/actions`,
          { userId, method: "POST", body: payload, signal },
        ),
      signal,
    );
  }

  ask(userId: string, phaseId: string, question: string, signal?: AbortSignal) {
    return this.withRetry(
      () =>
        this.request<AskResponse>(
          `/ask/${encodeURIComponent(userId)}/${encodeURIComponent(phaseId)}`,
          {
            userId,
            method: "POST",
            body: { question },
            signal,
          },
        ),
      signal,
    );
  }

  fold(
    userId: string,
    phaseId: string,
    concernId: string,
    idempotencyKey: string,
    signal?: AbortSignal,
  ) {
    return this.withRetry(
      () =>
        this.request<RoadmapResponse>(
          `/ask/${encodeURIComponent(userId)}/${encodeURIComponent(phaseId)}/roadmap-folds/${encodeURIComponent(concernId)}`,
          {
            userId,
            method: "POST",
            body: {
              confirm: true,
              stage: "arrived",
              idempotency_key: idempotencyKey,
            },
            signal,
          },
        ),
      signal,
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

  private async withRetry<T>(
    operation: () => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        if (
          !(error instanceof ApiError) ||
          ![503, 504].includes(error.status) ||
          attempt > 0
        ) {
          throw error;
        }
        await delay(150, signal);
      }
    }
  }

  private async request<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const requestId = crypto.randomUUID();
    const { userId, ...requestInit } = options;
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...requestInit,
      body: requestInit.body ? JSON.stringify(requestInit.body) : undefined,
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
        ...(userId ? { "X-User-ID": userId } : {}),
        ...requestInit.headers,
      },
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: { code?: string; request_id?: string | null };
      } | null;
      throw new ApiError(
        body?.error?.code ?? "http_error",
        body?.error?.request_id ?? response.headers.get("X-Request-ID"),
        response.status,
      );
    }

    return (await response.json()) as T;
  }
}

function delay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(
          signal.reason ??
            new DOMException("The operation was aborted", "AbortError"),
        );
      },
      { once: true },
    );
  });
}

export const apiClient = new LifeCurriculumClient();
