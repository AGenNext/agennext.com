import { NextResponse } from "next/server";
import { AGENT_CORE, enabledAgents } from "@/lib/agents/registry";
import { PROTOCOL_VERSION } from "@/lib/protocol";

/**
 * GET /api/agents — the public agent catalog: the runtime plus the enabled
 * agents and how to invoke each. Unauthenticated so the agent protocol is
 * discoverable.
 */
export async function GET() {
  return NextResponse.json({
    protocol: PROTOCOL_VERSION,
    runtime: AGENT_CORE,
    data: { agents: enabledAgents() },
  });
}
