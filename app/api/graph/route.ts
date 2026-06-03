import { NextResponse } from "next/server";
import { getFabric } from "@/lib/fabric";
import { JSONLD_CONTEXT, PROTOCOL_VERSION, type Query } from "@/lib/protocol";
import { metrics } from "@/lib/observability";
import { authenticate } from "@/lib/security/auth";
import { authorize, AuthzError } from "@/lib/security/authz";

/**
 * Protocol endpoint for the graph.
 *
 *   GET  /api/graph?type=Organization&text=agen&limit=20   -> QueryResult
 *   POST /api/graph  { "query": {...} }                     -> QueryResult
 *   POST /api/graph  { "node": {...} }                      -> upserted node
 *
 * Reads are public by default (toggle with the `public-reads` flag); writes
 * always require an authorized SPIFFE principal (see lib/security).
 */

function envelope<T>(data: T) {
  return { protocol: PROTOCOL_VERSION, "@context": JSONLD_CONTEXT, data };
}

function deny(err: AuthzError) {
  return NextResponse.json({ protocol: PROTOCOL_VERSION, error: err.message }, { status: err.status });
}

export async function GET(request: Request) {
  metrics.counter("agennext_http_requests_total", "HTTP requests", {
    route: "/api/graph",
    method: "GET",
  });
  try {
    authorize(authenticate(request), "graph:read");
  } catch (err) {
    if (err instanceof AuthzError) return deny(err);
    throw err;
  }
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
  const principal = authenticate(request);

  if (body.node) {
    try {
      const saved = await fabric.upsert(body.node as never, principal);
      return NextResponse.json(envelope(saved), { status: 201 });
    } catch (err) {
      if (err instanceof AuthzError) return deny(err);
      return NextResponse.json(
        { protocol: PROTOCOL_VERSION, error: err instanceof Error ? err.message : "upsert failed" },
        { status: 400 },
      );
    }
  }

  try {
    authorize(principal, "graph:read");
  } catch (err) {
    if (err instanceof AuthzError) return deny(err);
    throw err;
  }
  const result = await fabric.query((body.query as Query) ?? {});
  return NextResponse.json(envelope(result));
}
