import { NextResponse } from "next/server";
import { recentSpans } from "@/lib/observability/otel";
import { authenticate } from "@/lib/security/auth";
import { authorize, AuthzError } from "@/lib/security/authz";

/** Recent OpenTelemetry spans for the admin traces view. Requires read access. */
export async function GET(request: Request) {
  try {
    authorize(authenticate(request), "graph:read");
  } catch (err) {
    if (err instanceof AuthzError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
  return NextResponse.json({ spans: recentSpans() });
}
