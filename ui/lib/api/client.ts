import { appConfig } from "@/lib/config/app-config";
import { ApiError } from "./errors";
import type {
  AskResponse,
  CardAction,
  Enrollment,
  PublishedPhaseModule,
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
    return this.request<RoadmapResponse>(
      `/roadmap/${encodeURIComponent(userId)}/${encodeURIComponent(phaseId)}/actions`,
      { userId, method: "POST", body: payload, signal },
    );
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
    signal?: AbortSignal,
  ) {
    return this.request<RoadmapResponse>(
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

export const apiClient = new LifeCurriculumClient();
