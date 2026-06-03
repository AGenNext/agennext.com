import { NextResponse } from "next/server";
import { migrationTraced, MIGRATION_AGENT } from "@/lib/agents/migration";
import type { Distro } from "@/lib/migration/migration";
import { PROTOCOL_VERSION } from "@/lib/protocol";
import { metrics } from "@/lib/observability";
import { authenticate } from "@/lib/security/auth";
import { authorize, AuthzError } from "@/lib/security/authz";

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
    return NextResponse.json({ protocol: PROTOCOL_VERSION, agent: MIGRATION_AGENT.id, data: plan });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed" }, { status: 404 });
  }
}
