import { NextResponse } from "next/server";
import { k8sTraced, K8S_AGENT } from "@/lib/agents/k8s";
import { PROTOCOL_VERSION } from "@/lib/protocol";
import { metrics } from "@/lib/observability";
import { authenticate } from "@/lib/security/auth";
import { authorize, AuthzError } from "@/lib/security/authz";

/** POST /api/agents/k8s -> intended Kubernetes topology + readiness notes. */
export async function POST(request: Request) {
  metrics.counter("agennext_http_requests_total", "HTTP requests", {
    route: "/api/agents/k8s",
    method: "POST",
  });
  try {
    authorize(authenticate(request), "graph:read");
  } catch (err) {
    if (err instanceof AuthzError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
  const report = await k8sTraced();
  metrics.counter("agennext_agent_runs_total", "Agent runs", { agent: K8S_AGENT.id });
  return NextResponse.json({ protocol: PROTOCOL_VERSION, agent: K8S_AGENT.id, data: report });
}
