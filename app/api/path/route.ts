import { NextResponse } from "next/server";
import { getFabric } from "@/lib/fabric";
import { shortestPath } from "@/lib/graph/algorithms";
import { iri, labelOf, slugOf, PROTOCOL_VERSION } from "@/lib/protocol";
import { INVERSE_LABEL } from "@/lib/schema/org";
import { authenticate } from "@/lib/security/auth";
import { authorize, AuthzError } from "@/lib/security/authz";
import { metrics } from "@/lib/observability";

/**
 * GET /api/path?from=<slug>&to=<slug> — shortest route between two nodes
 * (a graph-theory "route problem"). Returns the ordered hops or 404.
 */
export async function GET(request: Request) {
  metrics.counter("agennext_http_requests_total", "HTTP requests", {
    route: "/api/path",
    method: "GET",
  });
  try {
    authorize(authenticate(request), "graph:read");
  } catch (err) {
    if (err instanceof AuthzError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "Provide 'from' and 'to' slugs." }, { status: 400 });
  }

  const { nodes, edges } = await getFabric().snapshot();
  const byId = new Map(nodes.map((n) => [n["@id"], n]));
  const path = shortestPath(edges, iri(from), iri(to));
  if (!path) {
    return NextResponse.json({ error: "No route between the nodes." }, { status: 404 });
  }

  return NextResponse.json({
    protocol: PROTOCOL_VERSION,
    data: {
      hops: path.length,
      steps: path.map((h) => ({
        from: slugOf(h.from),
        to: slugOf(h.to),
        label: byId.get(h.to) ? labelOf(byId.get(h.to)!) : h.to,
        relation: h.reversed ? INVERSE_LABEL[h.property] ?? `${h.property} of` : h.property,
      })),
    },
  });
}
