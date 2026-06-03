import { NextResponse } from "next/server";
import { AGENT_CORE, AGENTS } from "@/lib/agents/registry";
import { PROTOCOL_VERSION } from "@/lib/protocol";

/** GET /api/agents -> the AgentCore catalog of runnable agents. */
export async function GET() {
  return NextResponse.json({
    protocol: PROTOCOL_VERSION,
    runtime: AGENT_CORE,
    data: { agents: AGENTS },
  });
}
