import { RESEARCH_AGENT } from "@/lib/agents/research";
import { OPERATIONS_AGENT } from "@/lib/agents/operations";
import { K8S_AGENT } from "@/lib/agents/k8s";
import { OPERATOR_AGENT } from "@/lib/agents/operator";
import { MIGRATION_AGENT } from "@/lib/agents/migration";

/**
 * Agent Runtime — the lightweight agent registry/dispatcher.
 *
 * It holds the catalog of agents the platform can run and how to invoke each
 * (HTTP endpoint + input shape). A single source of truth for the /agents UI,
 * the catalog endpoint, and dispatch. (Distinct from AWS Bedrock AgentCore.)
 */
export interface AgentDescriptor {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  /** Input the agent expects, for the UI to render a runner. */
  input: "subject" | "none" | "migration";
}

export const AGENT_CORE = {
  id: "agent-runtime",
  name: "Agent Runtime",
  description: "The agent runtime: registers, describes, and dispatches the platform's agents.",
} as const;

const ALL_AGENTS: AgentDescriptor[] = [
  { ...RESEARCH_AGENT, endpoint: "/api/agents/research", input: "subject" },
  { ...OPERATIONS_AGENT, endpoint: "/api/agents/operations", input: "none" },
  { ...K8S_AGENT, endpoint: "/api/agents/k8s", input: "none" },
  { ...OPERATOR_AGENT, endpoint: "/api/agents/operator", input: "none" },
  { ...MIGRATION_AGENT, endpoint: "/api/agents/migration", input: "migration" },
];

/**
 * The runtime is configurable: agents can be disabled via the
 * `AGENTS_DISABLED` env var (comma-separated agent ids), so a deployment runs
 * only the agents it wants.
 */
export function enabledAgents(): AgentDescriptor[] {
  const disabled = new Set(
    (process.env.AGENTS_DISABLED ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  );
  return ALL_AGENTS.filter((a) => !disabled.has(a.id));
}

export const AGENTS: AgentDescriptor[] = ALL_AGENTS;
