import { NextResponse } from "next/server";
import { operatorTraced, OPERATOR_AGENT } from "@/lib/agents/operator";
import { PROTOCOL_VERSION } from "@/lib/protocol";
import { metrics } from "@/lib/observability";
import { authenticate } from "@/lib/security/auth";
import { authorize, AuthzError } from "@/lib/security/authz";

/** POST /api/agents/operator -> a prioritized reconcile/action plan. */
export async function POST(request: Request) {
  metrics.counter("agennext_http_requests_total", "HTTP requests", {
    route: "/api/agents/operator",
    method: "POST",
  });
  try {
    authorize(authenticate(request), "graph:read");
  } catch (err) {
    if (err instanceof AuthzError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
  const plan = await operatorTraced();
  metrics.counter("agennext_agent_runs_total", "Agent runs", { agent: OPERATOR_AGENT.id });
  return NextResponse.json({ protocol: PROTOCOL_VERSION, agent: OPERATOR_AGENT.id, data: plan });
}
