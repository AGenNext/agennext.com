import { NextResponse } from "next/server";
import { getFabric } from "@/lib/fabric";

/** Readiness probe — every connector reports healthy enough to serve. */
export async function GET() {
  const health = await getFabric().health();
  const code = health.status === "down" ? 503 : 200;
  return NextResponse.json({ check: "readiness", ...health }, { status: code });
}
