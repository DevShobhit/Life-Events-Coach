const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);
const apiUrl = (process.env.SMOKE_API_URL ?? "http://localhost:8000").replace(
  /\/$/,
  "",
);

type Check = { name: string; url: string; expected: RegExp };

const checks: Check[] = [
  { name: "now route", url: `${baseUrl}/now`, expected: /<main|Your next steady step/i },
  { name: "horizon route", url: `${baseUrl}/horizon`, expected: /<main|See what is ahead/i },
];

async function checkRoute(check: Check) {
  try {
    const response = await fetch(check.url, { redirect: "manual" });
    const body = await response.text();
    const ok = response.status >= 200 && response.status < 400 && check.expected.test(body);
    console.log(
      JSON.stringify({
        kind: "route_smoke",
        name: check.name,
        url: check.url,
        status: response.status,
        requestId: response.headers.get("x-request-id"),
        ok,
      }),
    );
    if (!ok) process.exitCode = 1;
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

async function checkApiHealth() {
  try {
    const response = await fetch(`${apiUrl}/health/live`);
    console.log(
      JSON.stringify({
        kind: "api_smoke",
        url: `${apiUrl}/health/live`,
        status: response.status,
        requestId: response.headers.get("x-request-id"),
        ok: response.ok,
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        kind: "api_smoke",
        url: `${apiUrl}/health/live`,
        error: error instanceof Error ? error.name : "unknown",
        ok: false,
      }),
    );
  }
}

await Promise.all([checkApiHealth(), ...checks.map(checkRoute)]);

if (process.exitCode) {
  throw new Error("Route smoke failed; inspect the structured records above.");
}
