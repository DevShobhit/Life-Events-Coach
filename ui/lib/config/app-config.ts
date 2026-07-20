const DEFAULT_API_URL = "http://localhost:8000";

export const appConfig = {
  apiUrl: normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL),
} as const;

function normalizeApiUrl(value: string | undefined): string {
  const candidate = value?.trim() || DEFAULT_API_URL;
  try {
    return new URL(candidate).toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_API_URL;
  }
}
