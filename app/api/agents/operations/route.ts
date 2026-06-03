import { NextResponse } from "next/server";
import { operationsTraced, OPERATIONS_AGENT } from "@/lib/agents/operations";
import { PROTOCOL_VERSION } from "@/lib/protocol";
import { metrics } from "@/lib/observability";
import { authenticate } from "@/lib/security/auth";
import { authorize, AuthzError } from "@/lib/security/authz";

/** POST /api/agents/operations -> an operational audit report. */
export async function POST(request: Request) {
  metrics.counter("agennext_http_requests_total", "HTTP requests", {
    route: "/api/agents/operations",
    method: "POST",
  });
  try {
    authorize(authenticate(request), "graph:read");
  } catch (err) {
    if (err instanceof AuthzError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
  const report = await operationsTraced();
  metrics.counter("agennext_agent_runs_total", "Agent runs", { agent: OPERATIONS_AGENT.id });
  return NextResponse.json({ protocol: PROTOCOL_VERSION, agent: OPERATIONS_AGENT.id, data: report });
}
