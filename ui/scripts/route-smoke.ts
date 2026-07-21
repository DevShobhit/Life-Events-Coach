import {
  buildRoadmapSmokeHeaders,
  classifyRouteResponse,
} from "./route-smoke-utils";

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);
const apiUrl = (process.env.SMOKE_API_URL ?? "http://localhost:8000").replace(
  /\/$/,
  "",
);
const smokeUserId = process.env.SMOKE_USER_ID?.trim();
const smokeAuthToken = process.env.SMOKE_AUTH_TOKEN?.trim();
const smokePhaseId = process.env.SMOKE_PHASE_ID?.trim() ?? "relocation";
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? "30000");

type Check = { name: string; url: string; expected: RegExp };

const checks: Check[] = [
  {
    name: "now route",
    url: `${baseUrl}/now`,
    expected: /<main|Your next steady step/i,
  },
  {
    name: "horizon route",
    url: `${baseUrl}/horizon`,
    expected: /<main|See what is ahead/i,
  },
  {
    name: "editorial route",
    url: `${baseUrl}/editorial`,
    expected: /<main|Shape the curriculum/i,
  },
];

async function checkRoute(check: Check) {
  try {
    const response = await fetch(check.url, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await response.text();
    const classification = classifyRouteResponse(
      response.status,
      response.headers.get("content-type"),
      body,
      check.expected,
    );
    console.log(
      JSON.stringify({
        kind: "route_smoke",
        name: check.name,
        url: check.url,
        status: response.status,
        requestId: response.headers.get("x-request-id"),
        ...classification,
      }),
    );
    if (!classification.ok) process.exitCode = 1;
  } catch (error) {
    console.error(
      JSON.stringify({
        kind: "route_smoke",
        name: check.name,
        url: check.url,
        error: error instanceof Error ? error.name : "unknown",
        ok: false,
      }),
    );
    process.exitCode = 1;
  }
}

async function checkApiEndpoint(
  name: string,
  path: string,
  options: RequestInit = {},
  displayPath = path,
) {
  try {
    const response = await fetch(`${apiUrl}${path}`, {
      ...options,
      signal: options.signal ?? AbortSignal.timeout(timeoutMs),
    });
    console.log(
      JSON.stringify({
        kind: "api_smoke",
        name,
        path: displayPath,
        status: response.status,
        requestId: response.headers.get("x-request-id"),
        ok: response.ok,
      }),
    );
    if (!response.ok) process.exitCode = 1;
  } catch (error) {
    console.error(
      JSON.stringify({
        kind: "api_smoke",
        name,
        path: displayPath,
        error: error instanceof Error ? error.name : "unknown",
        ok: false,
      }),
    );
    process.exitCode = 1;
  }
}

async function checkOptionalRoadmap() {
  if (!smokeUserId) return;
  const requestPath = `/roadmap/${encodeURIComponent(smokeUserId)}/${encodeURIComponent(smokePhaseId)}?stage=arrived`;
  await checkApiEndpoint(
    "roadmap",
    requestPath,
    {
      headers: buildRoadmapSmokeHeaders(smokeUserId, smokeAuthToken),
    },
    `/roadmap/:user/${encodeURIComponent(smokePhaseId)}?stage=arrived`,
  );
}

await Promise.all([
  checkApiEndpoint("health", "/health/live"),
  checkApiEndpoint("readiness", "/health/ready"),
  checkApiEndpoint("phase_catalog", "/phases"),
  checkOptionalRoadmap(),
  ...checks.map(checkRoute),
]);

if (process.exitCode) {
  throw new Error("Route smoke failed; inspect the structured records above.");
}
