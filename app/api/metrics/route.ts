import { getFabric } from "@/lib/fabric";
import { metrics } from "@/lib/observability";
import { flags } from "@/lib/flags";

/**
 * OpenMetrics/Prometheus exposition endpoint.
 *
 * Scrapeable by an OpenTelemetry Collector or HertzBeat. Includes platform
 * counters plus a synthetic OpenCost-style cost gauge and fabric gauges
 * refreshed on each scrape.
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
  // OpenCost-style allocation signal (illustrative monthly USD estimate).
  metrics.gauge(
    "agennext_estimated_cost_usd",
    "Estimated monthly infrastructure cost (OpenCost-style)",
    Number(process.env.OPENCOST_MONTHLY_USD ?? 0),
    { component: "platform" },
  );
  metrics.gauge("agennext_flag_provider_info", "Active OpenFeature provider", 1, {
    provider: flags.providerName(),
  });

  return new Response(metrics.render(), {
    headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" },
  });
}
