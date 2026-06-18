import { NextResponse } from "next/server";
import { getFabric } from "@/lib/fabric";

/** Liveness probe — process is up and the fabric is constructed. */
export async function GET() {
  getFabric();
  return NextResponse.json({ status: "ok", check: "liveness" });
}
