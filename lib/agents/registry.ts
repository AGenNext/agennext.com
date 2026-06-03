import { RESEARCH_AGENT } from "@/lib/agents/research";
import { OPERATIONS_AGENT } from "@/lib/agents/operations";
import { K8S_AGENT } from "@/lib/agents/k8s";

/**
 * AgentCore — the lightweight agent runtime/registry.
 *
 * It holds the catalog of agents the platform can run and how to invoke each
 * (HTTP endpoint + input shape). A single source of truth for the /agents UI,
 * the catalog endpoint, and dispatch.
 */
export interface AgentDescriptor {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  /** Input the agent expects, for the UI to render a runner. */
  input: "subject" | "none";
}

export const AGENT_CORE = {
  id: "agent-core",
  name: "AgentCore",
  description: "The agent runtime: registers, describes, and dispatches the platform's agents.",
} as const;

export const AGENTS: AgentDescriptor[] = [
  { ...RESEARCH_AGENT, endpoint: "/api/agents/research", input: "subject" },
  { ...OPERATIONS_AGENT, endpoint: "/api/agents/operations", input: "none" },
  { ...K8S_AGENT, endpoint: "/api/agents/k8s", input: "none" },
];
