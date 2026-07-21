export {};

type BrowserModule = {
  chromium: {
    launch(options?: {
      headless?: boolean;
      executablePath?: string;
      args?: string[];
    }): Promise<Browser>;
  };
};

type Browser = {
  newPage(): Promise<Page>;
  close(): Promise<void>;
};

type Page = {
  on(event: string, handler: (value: any) => void): void;
  setViewportSize(size: { width: number; height: number }): Promise<void>;
  goto(url: string, options?: { waitUntil?: string; timeout?: number }): Promise<any>;
  waitForTimeout(timeout: number): Promise<void>;
  evaluate<T>(fn: () => T): Promise<T>;
  close(): Promise<void>;
};

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const apiUrl = (process.env.SMOKE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? "30000");
const routes = ["/now", "/horizon"];
const viewports = [320, 768, 1024, 1440];

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.origin === new URL(baseUrl).origin || url.origin === new URL(apiUrl).origin
      ? `${url.origin}${url.pathname}`
      : url.origin;
  } catch {
    return "invalid-url";
  }
}

async function loadBrowser(): Promise<BrowserModule> {
  try {
    const load = new Function("specifier", "return import(specifier)") as (
      specifier: string,
    ) => Promise<BrowserModule>;
    return await load("@playwright/test");
  } catch {
    throw new Error(
      "Browser smoke requires @playwright/test. Install it in the UI workspace before running smoke:browser.",
    );
  }
}

const { chromium } = await loadBrowser();
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.SMOKE_BROWSER_EXECUTABLE,
  args: ["--no-sandbox", "--disable-gpu"],
});
let failed = false;

try {
  for (const route of routes) {
    for (const width of viewports) {
      const page = await browser.newPage();
      await page.setViewportSize({ width, height: 900 });
      const consoleErrors: string[] = [];
      const failedRequests: Array<{ url: string; status: number | null }> = [];
      const roadmapRequests: Array<{ url: string; status: number | null }> = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(String(message.text()));
      });
      page.on("requestfailed", (request) => {
        failedRequests.push({ url: safeUrl(request.url()), status: null });
      });
      page.on("response", (response) => {
        if (response.url().includes("/roadmap/")) {
          roadmapRequests.push({ url: safeUrl(response.url()), status: response.status() });
        }
      });

      let navigationStatus: number | null = null;
      try {
        const response = await page.goto(`${baseUrl}${route}`, {
          waitUntil: "domcontentloaded",
          timeout: timeoutMs,
        });
        navigationStatus = response?.status() ?? null;
        await page.waitForTimeout(500);
      } catch (error) {
        consoleErrors.push(error instanceof Error ? error.name : "navigation_failed");
      }

      const serviceWorker = await page.evaluate(() => {
        const registration = navigator.serviceWorker?.controller;
        return { controlled: Boolean(registration), scriptUrl: registration?.scriptURL ?? null };
      });
      const layout = await page.evaluate(() => ({
        hasMain: Boolean(document.querySelector("main")),
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      }));
      const successText = await page.evaluate(() => document.body?.innerText ?? "");
      const hasControlledState = /Your next steady step|See what is ahead|could not load|Try again|setup/i.test(
        successText,
      );
      const ok = navigationStatus !== null && navigationStatus < 400 && roadmapRequests.length > 0 && hasControlledState && layout.scrollWidth <= layout.viewportWidth;
      console.log(JSON.stringify({
        kind: "browser_route_smoke",
        route,
        viewportWidth: width,
        navigationStatus,
        roadmapRequests,
        serviceWorker,
        layout,
        consoleErrors,
        failedRequests,
        ok,
      }));
      if (!ok || consoleErrors.length > 0 || failedRequests.length > 0) failed = true;
      await page.close();
    }
  }
} finally {
  await browser.close();
}

if (failed) throw new Error("Browser route smoke failed; inspect structured diagnostics above.");
