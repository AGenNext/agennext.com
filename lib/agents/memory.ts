import { getFabric } from "@/lib/fabric";
import { getString, iri, slugOf, type GraphNode } from "@/lib/protocol";
import type { MigrationPlan } from "@/lib/migration/migration";

/**
 * Migration memory.
 *
 * Records each migration run to the fabric's durable backend (SurrealDB when
 * configured, else the file store) as a schema.org `Action` node, and reads the
 * history back. This is shared agent memory: the web app and the MCP server use
 * the same backend, so a plan recorded by one is visible to the other.
 */

export interface MigrationRun {
  id: string;
  source: string;
  target: string;
  summary: string;
  steps: number;
  risks: number;
  at: string;
}

export async function recordMigration(plan: MigrationPlan): Promise<string> {
  const id = `migration-${plan.source.id}-${plan.target}-${Date.now()}`;
  const node: GraphNode = {
    "@id": iri(id),
    "@type": "Action",
    name: `Migrate ${plan.source.id} → ${plan.target}`,
    description: plan.summary,
    actionStatus: "CompletedActionStatus",
    agent: { "@id": iri("agent-migration") },
    startTime: new Date().toISOString(),
    sourceCluster: plan.source.id,
    targetDistro: plan.target,
    stepCount: plan.steps.length,
    riskCount: plan.risks.length,
  };
  await getFabric().remember(node);
  return node["@id"];
}

function num(node: GraphNode, prop: string): number {
  const v = node[prop];
  return typeof v === "number" ? v : 0;
}

export async function migrationHistory(): Promise<MigrationRun[]> {
  const items = (await getFabric().query({ type: "Action" })).items.filter((n) =>
    (slugOf(n["@id"]) ?? "").startsWith("migration-"),
  );
  return items
    .map((n) => ({
      id: n["@id"],
      source: getString(n, "sourceCluster") ?? "",
      target: getString(n, "targetDistro") ?? "",
      summary: getString(n, "description") ?? "",
      steps: num(n, "stepCount"),
      risks: num(n, "riskCount"),
      at: getString(n, "startTime") ?? "",
    }))
    .sort((a, b) => b.at.localeCompare(a.at));
}
