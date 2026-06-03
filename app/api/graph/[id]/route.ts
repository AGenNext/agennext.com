import { NextResponse } from "next/server";
import { getFabric } from "@/lib/fabric";
import { iri, JSONLD_CONTEXT, PROTOCOL_VERSION } from "@/lib/protocol";
import { metrics } from "@/lib/observability";

/** GET /api/graph/:slug -> { node, outgoing, incoming } for one node. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  metrics.counter("agennext_http_requests_total", "HTTP requests", {
    route: "/api/graph/:id",
    method: "GET",
  });
  const result = await getFabric().node(iri(id));
  if (!result) {
    return NextResponse.json(
      { protocol: PROTOCOL_VERSION, error: `No node: ${id}` },
      { status: 404 },
    );
  }
  return NextResponse.json({
    protocol: PROTOCOL_VERSION,
    "@context": JSONLD_CONTEXT,
    data: result,
  });
}
