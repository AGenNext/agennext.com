import { NextResponse } from "next/server";
import { migrationTraced, MIGRATION_AGENT } from "@/lib/agents/migration";
import { recordMigration } from "@/lib/agents/memory";
import { executePlan } from "@/lib/migration/executor";
import type { Distro, Provider } from "@/lib/migration/migration";
import { PROTOCOL_VERSION } from "@/lib/protocol";
import { log, metrics } from "@/lib/observability";
import { authenticate } from "@/lib/security/auth";
import { authorize, AuthzError } from "@/lib/security/authz";

/**
 * POST /api/agents/migration/execute { source, provider, distro? }
 * Plans the migration, executes it (dry-run by default), records it to memory,
 * and returns the execution log.
 */
export async function POST(request: Request) {
  metrics.counter("agennext_http_requests_total", "HTTP requests", {
    route: "/api/agents/migration/execute",
    method: "POST",
  });
  try {
    authorize(authenticate(request), "graph:read");
  } catch (err) {
    if (err instanceof AuthzError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
  const body = (await request.json().catch(() => ({}))) as {
    source?: string;
    provider?: Provider;
    distro?: Distro;
  };
  if (!body.source || !body.provider) {
    return NextResponse.json({ error: "Provide 'source' and 'provider'." }, { status: 400 });
  }
  try {
    const plan = await migrationTraced(body.source, body.provider, body.distro);
    const execution = await executePlan(plan); // dry-run executor by default
    metrics.counter("agennext_agent_runs_total", "Agent runs", { agent: MIGRATION_AGENT.id });
    try {
      await recordMigration(plan);
    } catch (err) {
      log.warn("migration.memory.failed", { error: err instanceof Error ? err.message : String(err) });
    }
    return NextResponse.json({ protocol: PROTOCOL_VERSION, agent: MIGRATION_AGENT.id, data: { plan, execution } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed" }, { status: 404 });
  }
}
