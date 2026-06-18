/**
 * Observability facade over the OpenTelemetry API.
 *
 * Call sites use `log` / `metrics` / `span`; the heavy SDK wiring lives in
 * `otel.ts` and is bootstrapped from `instrumentation.ts`. When no provider is
 * registered (e.g. unit tests) the OTel API degrades to no-ops, so this module
 * is always safe to import.
 */
import {
  metrics as otelMetrics,
  trace,
  SpanStatusCode,
  type Attributes,
  type Counter,
} from "@opentelemetry/api";

const SCOPE = "agennext";

/* ----------------------------- logging ----------------------------- */

type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, message: string, attrs?: Attributes): void {
  const record = {
    severity: level.toUpperCase(),
    timestamp: new Date().toISOString(),
    body: message,
    ...attrs,
  };
  const line = JSON.stringify(record);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (m: string, a?: Attributes) => emit("debug", m, a),
  info: (m: string, a?: Attributes) => emit("info", m, a),
  warn: (m: string, a?: Attributes) => emit("warn", m, a),
  error: (m: string, a?: Attributes) => emit("error", m, a),
};

/* ----------------------------- metrics ----------------------------- */

const meter = () => otelMetrics.getMeter(SCOPE);

const counters = new Map<string, Counter>();

/** The Prometheus serializer appends `_total` to monotonic sums itself. */
function counterName(name: string): string {
  return name.replace(/_total$/, "");
}

interface GaugeSeries {
  value: number;
  attrs: Attributes;
}
const gaugeStores = new Map<string, Map<string, GaugeSeries>>();
const gaugeRegistered = new Set<string>();

function attrKey(attrs?: Attributes): string {
  if (!attrs) return "";
  return Object.keys(attrs)
    .sort()
    .map((k) => `${k}=${String(attrs[k])}`)
    .join(",");
}

export const metrics = {
  counter(name: string, help: string, labels?: Attributes, by = 1): void {
    const key = counterName(name);
    let c = counters.get(key);
    if (!c) {
      c = meter().createCounter(key, { description: help });
      counters.set(key, c);
    }
    c.add(by, labels);
  },

  gauge(name: string, help: string, value: number, labels?: Attributes): void {
    let store = gaugeStores.get(name);
    if (!store) {
      store = new Map();
      gaugeStores.set(name, store);
    }
    store.set(attrKey(labels), { value, attrs: labels ?? {} });

    if (!gaugeRegistered.has(name)) {
      gaugeRegistered.add(name);
      const g = meter().createObservableGauge(name, { description: help });
      const series = store; // stable reference observed on each collect
      g.addCallback((result) => {
        for (const s of series.values()) result.observe(s.value, s.attrs);
      });
    }
  },
};

/* ------------------------------ traces ----------------------------- */

/** Run `fn` inside an active OpenTelemetry span. */
export async function span<T>(
  name: string,
  fn: () => T | Promise<T>,
  attrs?: Attributes,
): Promise<T> {
  return trace.getTracer(SCOPE).startActiveSpan(name, async (s) => {
    try {
      if (attrs) s.setAttributes(attrs);
      const result = await fn();
      s.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      if (err instanceof Error) s.recordException(err);
      s.setStatus({
        code: SpanStatusCode.ERROR,
        message: err instanceof Error ? err.message : String(err),
      });
      throw err;
    } finally {
      s.end();
    }
  });
}
