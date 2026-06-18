import { policySummary } from "./authz";
import { workloadId } from "./spiffe";
import { AGENT_CORE, AGENTS } from "@/lib/agents/registry";

/**
 * Identity & Access Management view.
 *
 * Consolidates the platform's identity (SPIFFE trust domain + per-agent
 * workload identities) and access model (Permify-style permission→relation
 * rules + writer grants) into one read-only model for the IAM surface.
 * Aligns with emerging guidance on identity management for agentic AI: every
 * agent is a named workload identity in the trust domain.
 */
export interface AgentIdentity {
  id: string;
  name: string;
  spiffeId: string;
}

export interface IamModel {
  trustDomain: string;
  publicReads: boolean;
  permissions: Record<string, string[]>;
  writers: string[];
  agentIdentities: AgentIdentity[];
}

/** SPIFFE identity minted for an agent workload. */
export function agentIdentity(agentId: string): string {
  return workloadId(`/agents/${agentId}`).toString();
}

export function iamModel(): IamModel {
  const policy = policySummary();
  const agentIdentities: AgentIdentity[] = [AGENT_CORE, ...AGENTS].map((a) => ({
    id: a.id,
    name: a.name,
    spiffeId: agentIdentity(a.id),
  }));
  return {
    trustDomain: policy.trustDomain,
    publicReads: policy.publicReads,
    permissions: policy.permissions,
    writers: policy.writers,
    agentIdentities,
  };
}
