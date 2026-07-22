import { configureSync, getConsoleSink } from "@logtape/logtape";

configureSync({
  sinks: { console: getConsoleSink() },
  loggers: [
    {
      category: ["live-coach"],
      lowestLevel: process.env.NODE_ENV === "development" ? "debug" : "info",
      sinks: ["console"],
    },
  ],
});
