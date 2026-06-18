import pino from "pino";

/** Shared structured logger. Service name + level come from env. */
export function createLogger(service: string) {
  return pino({
    name: service,
    level: process.env.LOG_LEVEL || "info",
    base: { service },
  });
}
