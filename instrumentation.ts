/**
 * Next.js instrumentation hook — runs once when the server starts.
 * Initializes OpenTelemetry only in the Node.js runtime.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initOtel } = await import("@/lib/observability/otel");
    initOtel();
  }
}
