import { NextResponse } from "next/server";
import { CONSTITUTION } from "@/lib/agents/constitution";
import { PROTOCOL_VERSION } from "@/lib/protocol";

/** GET /api/constitution -> the Agent Constitution (public, discoverable). */
export async function GET() {
  return NextResponse.json({ protocol: PROTOCOL_VERSION, data: CONSTITUTION });
}
