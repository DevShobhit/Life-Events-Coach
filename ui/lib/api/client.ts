import { appConfig } from "@/lib/config/app-config";
import { apiLogger, isDevelopment } from "@/lib/logging/logger";
import { useSessionStore } from "@/lib/state/session";
import { ApiError } from "./errors";
import type {
  AccountDataExport,
  AskResponse,
  CardAction,
  EditorialDraft,
  EditorialFreshness,
  EditorialValidation,
  EditorialVersion,
  Enrollment,
  EnrollmentLifecycleEvent,
  NotificationPreference,
  PhaseModule,
  PublishedPhaseModule,
  RoadmapResponse,
} from "./types";
import { isRoadmapResponse } from "./types";

type ClientOptions = {
  baseUrl?: string;
  fetcher?: typeof fetch;
  getAccessToken?: () => string | null | Promise<string | null>;
};

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  userId?: string;
  editorialRole?: "editor" | "publisher" | "admin";
};

const loggedApiOrigins = new Set<string>();

export function apiOriginForDiagnostics(baseUrl: string): string {
  try {
    return new URL(baseUrl).origin;
  } catch {
    return "invalid-origin";
  }
}

function logConfiguredApiOrigin(baseUrl: string) {
  if (!isDevelopment) return;
  const origin = apiOriginForDiagnostics(baseUrl);
  if (loggedApiOrigins.has(origin)) return;
  loggedApiOrigins.add(origin);
  apiLogger.debug("api_origin_configured", { origin });
}

export class LifeCurriculumClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly getAccessToken: () => string | null | Promise<string | null>;

  constructor(options: ClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? appConfig.apiUrl;
    logConfiguredApiOrigin(this.baseUrl);
    this.getAccessToken =
      options.getAccessToken ?? (() => useSessionStore.getState().accessToken);
    const fetchImplementation = options.fetcher ?? globalThis.fetch;
    const fetchReceiver = typeof window === "undefined" ? globalThis : window;
    this.fetcher = (input, init) =>
      Reflect.apply(fetchImplementation, fetchReceiver, [input, init]);
  }

  phases(signal?: AbortSignal) {
    return this.request<PublishedPhaseModule[]>("/phases", { signal });
  }

  activeEnrollments(userId: string, signal?: AbortSignal) {
    return this.request<Enrollment[]>(
      `/enrollment/${encodeURIComponent(userId)}`,
      { userId, signal },
    );
  }

  editorialVersions(
    phaseId: string,
    role: "editor" | "publisher" | "admin",
    signal?: AbortSignal,
  ) {
    return this.request<EditorialVersion[]>(
      `/editorial/phases/${encodeURIComponent(phaseId)}/versions`,
      { editorialRole: role, signal },
    );
  }

  rollbackEditorialVersion(
    phaseId: string,
    version: number,
    expectedActiveVersion: number | null,
    role: "admin",
  ) {
    return this.request<{
      phase_id: string;
      version: number;
      previous_version: number | null;
      status: string;
    }>(
      `/editorial/phases/${encodeURIComponent(phaseId)}/versions/${version}/rollback`,
      {
        editorialRole: role,
        method: "POST",
        body: { expected_active_version: expectedActiveVersion },
      },
    );
  }

  editorialFreshness(phaseId: string, signal?: AbortSignal) {
    return this.request<EditorialFreshness>(
      `/editorial/freshness/${encodeURIComponent(phaseId)}`,
      { signal },
    );
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

  completeEnrollment(userId: string, phaseId: string) {
    return this.request<Enrollment>(
      `/enrollment/${encodeURIComponent(userId)}/${encodeURIComponent(phaseId)}/complete`,
      { userId, method: "POST" },
    );
  }

  archiveEnrollment(userId: string, phaseId: string) {
    return this.request<Enrollment>(
      `/enrollment/${encodeURIComponent(userId)}/${encodeURIComponent(phaseId)}/archive`,
      { userId, method: "POST" },
    );
  }

  enrollmentHistory(userId: string, signal?: AbortSignal) {
    return this.request<EnrollmentLifecycleEvent[]>(
      `/enrollment/${encodeURIComponent(userId)}/history`,
      { userId, signal },
    );
  }

  notificationPreferences(userId: string, signal?: AbortSignal) {
    return this.request<NotificationPreference>(
      `/notifications/preferences/${encodeURIComponent(userId)}`,
      { userId, signal },
    );
  }

  saveNotificationPreferences(
    userId: string,
    preference: { enabled: boolean; timezone: string; local_time: string },
  ) {
    return this.request<NotificationPreference>(
      `/notifications/preferences/${encodeURIComponent(userId)}`,
      { userId, method: "PUT", body: preference },
    );
  }

  exportAccount(userId: string, signal?: AbortSignal) {
    return this.request<AccountDataExport>(
      `/account/${encodeURIComponent(userId)}/export`,
      { userId, signal },
    );
  }

  deleteAccount(userId: string) {
    return this.request<{ deleted: boolean }>(
      `/account/${encodeURIComponent(userId)}/data`,
      { userId, method: "DELETE", body: { confirm: true } },
    );
  }

  editorialDrafts(
    phaseId: string,
    role: "editor" | "publisher" | "admin",
    signal?: AbortSignal,
  ) {
    return this.request<EditorialDraft[]>(
      `/editorial/phases/${encodeURIComponent(phaseId)}/drafts`,
      { editorialRole: role, signal },
    );
  }

  createEditorialDraft(
    phaseId: string,
    role: "editor" | "publisher" | "admin",
    module: PhaseModule,
  ) {
    return this.request<EditorialDraft>(
      `/editorial/phases/${encodeURIComponent(phaseId)}/drafts`,
      { editorialRole: role, method: "POST", body: { module } },
    );
  }

  editorialDraft(
    phaseId: string,
    draftId: string,
    role: "editor" | "publisher" | "admin",
    signal?: AbortSignal,
  ) {
    return this.request<EditorialDraft>(
      `/editorial/phases/${encodeURIComponent(phaseId)}/drafts/${encodeURIComponent(draftId)}`,
      { editorialRole: role, signal },
    );
  }

  editorialPreview(
    phaseId: string,
    draftId: string,
    role: "editor" | "publisher" | "admin",
  ) {
    return this.request<{
      phase_id: string;
      draft_id: string;
      version: number | null;
      module: PhaseModule;
    }>(
      `/editorial/phases/${encodeURIComponent(phaseId)}/drafts/${encodeURIComponent(draftId)}/preview`,
      { editorialRole: role },
    );
  }

  publishEditorialDraft(
    phaseId: string,
    draftId: string,
    role: "publisher" | "admin",
    expectedActiveVersion: number | null,
    idempotencyKey: string,
  ) {
    return this.request<{
      phase_id: string;
      draft_id: string;
      version: number;
      status: string;
      module: PhaseModule;
    }>(
      `/editorial/phases/${encodeURIComponent(phaseId)}/drafts/${encodeURIComponent(draftId)}/publish`,
      {
        editorialRole: role,
        method: "POST",
        body: {
          expected_active_version: expectedActiveVersion,
          idempotency_key: idempotencyKey,
        },
      },
    );
  }

  updateEditorialDraft(
    phaseId: string,
    draftId: string,
    role: "editor" | "publisher" | "admin",
    module: PhaseModule,
    expectedRevision: number,
  ) {
    return this.request<EditorialDraft>(
      `/editorial/phases/${encodeURIComponent(phaseId)}/drafts/${encodeURIComponent(draftId)}`,
      {
        editorialRole: role,
        method: "PATCH",
        body: { module, expected_revision: expectedRevision },
      },
    );
  }

  validateEditorialDraft(
    phaseId: string,
    draftId: string,
    role: "editor" | "publisher" | "admin",
  ) {
    return this.request<EditorialValidation>(
      `/editorial/phases/${encodeURIComponent(phaseId)}/drafts/${encodeURIComponent(draftId)}/validate`,
      { editorialRole: role, method: "POST" },
    );
  }

  private async request<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const requestId = crypto.randomUUID();
    const { userId, editorialRole, ...requestInit } = options;
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
      const accessToken = await this.getAccessToken();
      response = await this.fetcher(`${this.baseUrl}${path}`, {
        ...requestInit,
        body: requestInit.body ? JSON.stringify(requestInit.body) : undefined,
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": requestId,
          ...(accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : userId
              ? { "X-User-ID": userId }
              : {}),
          ...(editorialRole ? { "X-User-Role": editorialRole } : {}),
          ...requestInit.headers,
        },
      });
    } catch (error) {
      apiLogger.warn("api_request_failed", {
        method,
        path: logPath,
        targetOrigin: apiOriginForDiagnostics(this.baseUrl),
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
