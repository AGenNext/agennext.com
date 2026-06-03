/**
 * OpenTelemetry-shaped observability primitives.
 *
 * This is a dependency-free core that mirrors the OTel data model (spans,
 * metrics, structured logs) so the platform is instrumented from day one and
 * can be wired to a real OTel SDK/exporter later without touching call sites.
 * Metrics render in OpenMetrics/Prometheus text format for scraping by an
 * OTel Collector (or HertzBeat).
 */

type Attributes = Record<string, string | number | boolean>;

/* ----------------------------- logging ----------------------------- */

type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, message: string, attrs?: Attributes): void {
  const record = {
    severity: level.toUpperCase(),
    timestamp: new Date().toISOString(),
    body: message,
    ...attrs,
  };
  // Structured logs to stdout/stderr — the 12-factor way; a collector tails them.
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

interface Series {
  type: "counter" | "gauge";
  help: string;
  values: Map<string, number>; // serialized-labels -> value
}

const registry = new Map<string, Series>();

function key(labels?: Attributes): string {
  if (!labels) return "";
  return Object.keys(labels)
    .sort()
    .map((k) => `${k}="${String(labels[k]).replace(/"/g, '\\"')}"`)
    .join(",");
}

function series(name: string, type: Series["type"], help: string): Series {
  let s = registry.get(name);
  if (!s) {
    s = { type, help, values: new Map() };
    registry.set(name, s);
  }
  return s;
}

export const metrics = {
  counter(name: string, help: string, labels?: Attributes, by = 1): void {
    const s = series(name, "counter", help);
    const k = key(labels);
    s.values.set(k, (s.values.get(k) ?? 0) + by);
  },
  gauge(name: string, help: string, value: number, labels?: Attributes): void {
    const s = series(name, "gauge", help);
    s.values.set(key(labels), value);
  },
  /** Render the registry in OpenMetrics/Prometheus exposition format. */
  render(): string {
    const lines: string[] = [];
    for (const [name, s] of registry) {
      lines.push(`# HELP ${name} ${s.help}`);
      lines.push(`# TYPE ${name} ${s.type}`);
      for (const [labels, value] of s.values) {
        lines.push(labels ? `${name}{${labels}} ${value}` : `${name} ${value}`);
      }
    }
    return lines.join("\n") + "\n";
  },
};

/* ------------------------------ traces ----------------------------- */

/**
 * Minimal span: times an operation, records duration as a metric, and logs
 * the outcome. Mirrors `tracer.startActiveSpan` ergonomics.
 */
export async function span<T>(
  name: string,
  fn: () => T | Promise<T>,
  attrs?: Attributes,
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const ms = performance.now() - start;
    metrics.counter("agennext_span_total", "Spans by name and status", {
      span: name,
      status: "ok",
    });
    metrics.gauge("agennext_span_duration_ms", "Last span duration (ms)", ms, {
      span: name,
    });
    log.debug("span.end", { span: name, status: "ok", duration_ms: Math.round(ms), ...attrs });
    return result;
  } catch (err) {
    metrics.counter("agennext_span_total", "Spans by name and status", {
      span: name,
      status: "error",
    });
    log.error("span.error", {
      span: name,
      error: err instanceof Error ? err.message : String(err),
      ...attrs,
    });
    throw err;
  }
}
