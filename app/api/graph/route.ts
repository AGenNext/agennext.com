import { NextResponse } from "next/server";
import { getFabric } from "@/lib/fabric";
import { JSONLD_CONTEXT, PROTOCOL_VERSION, type Query } from "@/lib/protocol";
import { metrics } from "@/lib/observability";

/**
 * Protocol endpoint for the graph.
 *
 *   GET  /api/graph?type=Organization&text=agen&limit=20   -> QueryResult
 *   POST /api/graph  { "query": {...} }                     -> QueryResult
 *   POST /api/graph  { "node": {...} }                      -> upserted node
 */

function envelope<T>(data: T) {
  return { protocol: PROTOCOL_VERSION, "@context": JSONLD_CONTEXT, data };
}

export async function GET(request: Request) {
  metrics.counter("agennext_http_requests_total", "HTTP requests", {
    route: "/api/graph",
    method: "GET",
  });
  const { searchParams } = new URL(request.url);
  const query: Query = {
    type: searchParams.get("type") ?? undefined,
    text: searchParams.get("text") ?? undefined,
    limit: searchParams.has("limit") ? Number(searchParams.get("limit")) : undefined,
    offset: searchParams.has("offset") ? Number(searchParams.get("offset")) : undefined,
  };
  const result = await getFabric().query(query);
  return NextResponse.json(envelope(result));
}

export async function POST(request: Request) {
  metrics.counter("agennext_http_requests_total", "HTTP requests", {
    route: "/api/graph",
    method: "POST",
  });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const fabric = getFabric();

  if (body.node) {
    try {
      const saved = await fabric.upsert(body.node as never);
      return NextResponse.json(envelope(saved), { status: 201 });
    } catch (err) {
      return NextResponse.json(
        { protocol: PROTOCOL_VERSION, error: err instanceof Error ? err.message : "upsert failed" },
        { status: 403 },
      );
    }
  }

  const result = await fabric.query((body.query as Query) ?? {});
  return NextResponse.json(envelope(result));
}
