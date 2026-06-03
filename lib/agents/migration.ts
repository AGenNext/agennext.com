import { CLUSTERS, planMigration, type Distro, type MigrationPlan } from "@/lib/migration/migration";
import { span } from "@/lib/observability";

/**
 * Migration Agent.
 *
 * Drives a Kubernetes migration: discovery (inventory the source cluster),
 * planning (steps + risk analysis), validation, and rollback. Works over the
 * cluster inventory; in a live deployment the inventory comes from the
 * Kubernetes MCP server and history is persisted to SurrealDB memory.
 */

export const MIGRATION_AGENT = {
  id: "migration-agent",
  name: "Migration Agent",
  description: "Plans and validates Kubernetes migrations (k3s ↔ MicroK8s, EKS/GKE/AKS).",
} as const;

export function migrationTraced(sourceId: string, target: Distro): Promise<MigrationPlan> {
  return span("agent.migration", () => runMigration(sourceId, target), { source: sourceId, target });
}

function runMigration(sourceId: string, target: Distro): MigrationPlan {
  const source = CLUSTERS[sourceId];
  if (!source) throw new Error(`Unknown source cluster: ${sourceId}`);
  return planMigration(source, target);
}

/** Available source clusters, for the runner UI. */
export function migrationSources() {
  return Object.values(CLUSTERS).map((c) => ({ id: c.id, name: c.name, distro: c.distro }));
}
