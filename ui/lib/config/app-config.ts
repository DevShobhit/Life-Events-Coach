const DEFAULT_API_PORT = "8000";
const FALLBACK_API_URL = `http://localhost:${DEFAULT_API_PORT}`;

export const appConfig = {
  apiUrl: normalizeApiUrl(
    process.env.NEXT_PUBLIC_API_URL ?? browserDefaultApiUrl(),
  ),
} as const;

export function browserDefaultApiUrl(): string {
  if (typeof window === "undefined") return FALLBACK_API_URL;
  const protocol = window.location.protocol === "https:" ? "https" : "http";
  return `${protocol}://${window.location.hostname}:${DEFAULT_API_PORT}`;
}

function normalizeApiUrl(value: string | undefined): string {
  const candidate = value?.trim() || FALLBACK_API_URL;
  try {
    return new URL(candidate).toString().replace(/\/$/, "");
  } catch {
    return FALLBACK_API_URL;
  }
}
