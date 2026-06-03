import { NextResponse } from "next/server";
import { migrationTraced, MIGRATION_AGENT } from "@/lib/agents/migration";
import { migrationHistory, recordMigration } from "@/lib/agents/memory";
import type { Distro } from "@/lib/migration/migration";
import { PROTOCOL_VERSION } from "@/lib/protocol";
import { log, metrics } from "@/lib/observability";
import { authenticate } from "@/lib/security/auth";
import { authorize, AuthzError } from "@/lib/security/authz";

/** GET /api/agents/migration -> recent migration runs from memory. */
export async function GET(request: Request) {
  try {
    authorize(authenticate(request), "graph:read");
  } catch (err) {
    if (err instanceof AuthzError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
  return NextResponse.json({ protocol: PROTOCOL_VERSION, data: { history: await migrationHistory() } });
}

/** POST /api/agents/migration { source, target } -> a migration plan. */
export async function POST(request: Request) {
  metrics.counter("agennext_http_requests_total", "HTTP requests", {
    route: "/api/agents/migration",
    method: "POST",
  });
  try {
    authorize(authenticate(request), "graph:read");
  } catch (err) {
    if (err instanceof AuthzError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
  const body = (await request.json().catch(() => ({}))) as { source?: string; target?: Distro };
  if (!body.source || !body.target) {
    return NextResponse.json({ error: "Provide 'source' and 'target'." }, { status: 400 });
  }
  try {
    const plan = await migrationTraced(body.source, body.target);
    metrics.counter("agennext_agent_runs_total", "Agent runs", { agent: MIGRATION_AGENT.id });
    // Persist to shared agent memory (best-effort; never fail the plan on it).
    let memoryId: string | undefined;
    try {
      memoryId = await recordMigration(plan);
    } catch (err) {
      log.warn("migration.memory.failed", { error: err instanceof Error ? err.message : String(err) });
    }
    return NextResponse.json({ protocol: PROTOCOL_VERSION, agent: MIGRATION_AGENT.id, memoryId, data: plan });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed" }, { status: 404 });
  }
}
