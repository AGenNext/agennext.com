import { NextResponse } from "next/server";
import { controlState } from "@/lib/controlplane/platform";
import { PROTOCOL_VERSION } from "@/lib/protocol";
import { metrics } from "@/lib/observability";

/**
 * Control-plane endpoint: the live desired + observed state of the platform,
 * shaped like the Crossplane `AgennextPlatform` composite resource.
 */
export async function GET() {
  metrics.counter("agennext_http_requests_total", "HTTP requests", {
    route: "/api/control",
    method: "GET",
  });
  const state = await controlState();
  return NextResponse.json({ protocol: PROTOCOL_VERSION, data: state });
}
