/**
 * Real OpenTelemetry wiring.
 *
 * Initializes a global TracerProvider and MeterProvider. Traces and metrics
 * export via OTLP when `OTEL_EXPORTER_OTLP_ENDPOINT` is set; regardless, a
 * pull-based metric reader backs the `/api/metrics` OpenMetrics endpoint so
 * Prometheus/HertzBeat can scrape without a collector.
 *
 * Bootstrapped once from `instrumentation.ts` (Next.js instrumentation hook).
 */
import { metrics as metricsApi } from "@opentelemetry/api";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import {
  MeterProvider,
  MetricReader,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { PrometheusSerializer } from "@opentelemetry/exporter-prometheus";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

/** A MetricReader whose metrics we pull on demand (for the scrape endpoint). */
class PullMetricReader extends MetricReader {
  protected async onForceFlush(): Promise<void> {}
  protected async onShutdown(): Promise<void> {}
}

/**
 * Next bundles `instrumentation.ts` and the route handlers into separate
 * chunks, each with its own copy of this module. Keep the reader on globalThis
 * so the chunk that initializes it and the chunk that scrapes it share state.
 * (The OTel API global provider already self-shares via a globalThis symbol.)
 */
const GLOBAL = globalThis as unknown as { __agennextOtel?: { reader: PullMetricReader } };

export function initOtel(): void {
  if (GLOBAL.__agennextOtel) return;

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? "agennext",
    [ATTR_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION ?? "1.0.0",
  });

  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  // ---- Tracing ----
  const spanProcessors = otlpEndpoint ? [new BatchSpanProcessor(new OTLPTraceExporter())] : [];
  const tracerProvider = new NodeTracerProvider({ resource, spanProcessors });
  tracerProvider.register(); // sets global tracer provider + context manager

  // ---- Metrics ----
  const pullReader = new PullMetricReader();
  const readers: MetricReader[] = [pullReader];
  if (otlpEndpoint) {
    readers.push(
      new PeriodicExportingMetricReader({ exporter: new OTLPMetricExporter() }),
    );
  }
  const meterProvider = new MeterProvider({ resource, readers });
  metricsApi.setGlobalMeterProvider(meterProvider);

  GLOBAL.__agennextOtel = { reader: pullReader };
}

/** Render the current metrics in OpenMetrics/Prometheus text format. */
export async function collectMetrics(): Promise<string> {
  const reader = GLOBAL.__agennextOtel?.reader;
  if (!reader) return "# OpenTelemetry not initialized\n";
  const { resourceMetrics } = await reader.collect();
  return new PrometheusSerializer().serialize(resourceMetrics);
}
