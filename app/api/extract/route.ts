import { NextResponse } from "next/server";
import { extract } from "@/lib/ai/extract";
import { JSONLD_CONTEXT, PROTOCOL_VERSION } from "@/lib/protocol";
import { metrics } from "@/lib/observability";

/**
 * AI-native ingestion endpoint.
 *
 *   POST /api/extract  { "text": "...", "type": "Organization" }
 *
 * Returns candidate schema.org nodes. Read-only by design: it proposes nodes;
 * persisting them goes through the flag-gated write path on /api/graph.
 */
export async function POST(request: Request) {
  metrics.counter("agennext_http_requests_total", "HTTP requests", {
    route: "/api/extract",
    method: "POST",
  });
  const body = (await request.json().catch(() => ({}))) as { text?: string; type?: string };
  if (!body.text || typeof body.text !== "string") {
    return NextResponse.json(
      { protocol: PROTOCOL_VERSION, error: "Body must include a 'text' string." },
      { status: 400 },
    );
  }
  const nodes = await extract(body.text, body.type);
  metrics.counter("agennext_ai_extract_total", "AI extraction calls", {}, 1);
  return NextResponse.json({
    protocol: PROTOCOL_VERSION,
    "@context": JSONLD_CONTEXT,
    data: { items: nodes, total: nodes.length },
  });
}
