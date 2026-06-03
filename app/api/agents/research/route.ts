import { NextResponse } from "next/server";
import { getFabric } from "@/lib/fabric";
import { researchTraced, RESEARCH_AGENT } from "@/lib/agents/research";
import { iri, PROTOCOL_VERSION } from "@/lib/protocol";
import { metrics } from "@/lib/observability";
import { authenticate } from "@/lib/security/auth";
import { authorize, AuthzError } from "@/lib/security/authz";

/** POST /api/agents/research { id | slug, hops? } -> a research brief. */
export async function POST(request: Request) {
  metrics.counter("agennext_http_requests_total", "HTTP requests", {
    route: "/api/agents/research",
    method: "POST",
  });
  try {
    authorize(authenticate(request), "graph:read");
  } catch (err) {
    if (err instanceof AuthzError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const body = (await request.json().catch(() => ({}))) as { id?: string; slug?: string; hops?: number };
  const id = body.id ?? (body.slug ? iri(body.slug) : undefined);
  if (!id) {
    return NextResponse.json({ error: "Provide an 'id' or 'slug'." }, { status: 400 });
  }

  try {
    const snapshot = await getFabric().snapshot();
    const brief = await researchTraced(snapshot, id, body.hops ?? 2);
    metrics.counter("agennext_agent_runs_total", "Agent runs", { agent: RESEARCH_AGENT.id });
    return NextResponse.json({ protocol: PROTOCOL_VERSION, agent: RESEARCH_AGENT.id, data: brief });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "research failed" },
      { status: 404 },
    );
  }
}
