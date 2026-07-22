import { getLogger } from "@logtape/logtape";

export const uiLogger = getLogger(["live-coach", "ui"]);
export const apiLogger = getLogger(["live-coach", "api"]);

export const isDevelopment = process.env.NODE_ENV === "development";

export function logDevelopment(
  message: string,
  properties?: Record<string, unknown>,
) {
  if (isDevelopment) {
    uiLogger.debug(message, properties);
  }
}

export function logServiceWorkerFailure(
  message: string,
  properties?: Record<string, unknown>,
) {
  uiLogger.warn(message, properties);
}
