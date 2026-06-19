import * as Sentry from "@sentry/node";

/**
 * Conditionally initialise Sentry for a service. No-op unless SENTRY_DSN is set,
 * so this is safe to call unconditionally at startup. Mirrors the monolith's
 * server/src/lib/sentry.ts. Tags every event with the service name.
 */
export function initSentry(serviceName: string): boolean {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "production",
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"),
    attachStacktrace: true,
    initialScope: { tags: { service: serviceName } },
  });
  return true;
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}
