import { NextResponse } from "next/server";
import { iamModel } from "@/lib/security/iam";
import { PROTOCOL_VERSION } from "@/lib/protocol";
import { authenticate } from "@/lib/security/auth";
import { authorize, AuthzError } from "@/lib/security/authz";

/** GET /api/iam -> the identity & access model (read-authorized). */
export async function GET(request: Request) {
  try {
    authorize(authenticate(request), "graph:read");
  } catch (err) {
    if (err instanceof AuthzError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
  return NextResponse.json({ protocol: PROTOCOL_VERSION, data: iamModel() });
}
