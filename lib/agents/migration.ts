import {
  CLUSTERS,
  PROVIDERS,
  planMigration,
  resolveTargetDistro,
  type Distro,
  type MigrationPlan,
  type Provider,
} from "@/lib/migration/migration";
import { span } from "@/lib/observability";

/**
 * Migration Agent.
 *
 * Drives a Kubernetes migration: discovery (inventory the source cluster),
 * planning (steps + risk analysis), validation, and rollback. Targets a
 * provider (the "migrate by changing an endpoint" model) which resolves to a
 * distro; in a live deployment the inventory comes from the Kubernetes MCP
 * server and history is persisted to SurrealDB memory.
 */

export const MIGRATION_AGENT = {
  id: "migration-agent",
  name: "Migration Agent",
  description: "Plans and validates Kubernetes migrations across distros and cloud providers.",
} as const;

export function migrationTraced(
  sourceId: string,
  provider: Provider,
  distro?: Distro,
): Promise<MigrationPlan> {
  return span("agent.migration", () => runMigration(sourceId, provider, distro), {
    source: sourceId,
    provider,
  });
}

function runMigration(sourceId: string, provider: Provider, distro?: Distro): MigrationPlan {
  const source = CLUSTERS[sourceId];
  if (!source) throw new Error(`Unknown source cluster: ${sourceId}`);
  const target = resolveTargetDistro(provider, distro);
  return planMigration(source, target, provider);
}

/** Available source clusters, for the runner UI. */
export function migrationSources() {
  return Object.values(CLUSTERS).map((c) => ({ id: c.id, name: c.name, distro: c.distro }));
}

/** Available target providers, for the runner UI. */
export function migrationProviders() {
  return Object.values(PROVIDERS).map((p) => ({ id: p.id, name: p.name, distro: p.distro, managed: p.managed }));
}
