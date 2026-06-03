import { getFabric } from "@/lib/fabric";
import { metrics } from "@/lib/observability";
import { collectMetrics } from "@/lib/observability/otel";
import { flags } from "@/lib/flags";

/**
 * OpenMetrics/Prometheus exposition, rendered from the OpenTelemetry meter
 * provider via a pull reader. Scrapeable by an OTel Collector or HertzBeat.
 * Per-scrape gauges (graph size, readiness, OpenCost-style cost) are refreshed
 * before collection.
 */
export async function GET() {
  const health = await getFabric().health();
  let nodes = 0;
  for (const c of health.connectors) nodes += c.nodes ?? 0;

  metrics.gauge("agennext_graph_nodes", "Nodes currently in the graph", nodes);
  metrics.gauge(
    "agennext_up",
    "Platform readiness (1=ok, 0.5=degraded, 0=down)",
    health.status === "ok" ? 1 : health.status === "degraded" ? 0.5 : 0,
  );
  metrics.gauge(
    "agennext_estimated_cost_usd",
    "Estimated monthly infrastructure cost (OpenCost-style)",
    Number(process.env.OPENCOST_MONTHLY_USD ?? 0),
    { component: "platform" },
  );
  metrics.gauge("agennext_flag_provider_info", "Active OpenFeature provider", 1, {
    provider: flags.providerName(),
  });

  const body = await collectMetrics();
  return new Response(body, {
    headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" },
  });
}
