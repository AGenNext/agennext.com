/**
 * AGenNext MCP server.
 *
 * Exposes platform capabilities as Model Context Protocol tools over stdio so
 * any MCP client (Claude, IDEs, other agents) can drive them. This is the
 * `surrealdb` + `kubernetes`-style tool surface for the agent platform; the
 * Kubernetes/Helm/Git/Terraform/SSH tools plug in here next.
 *
 * Run:  npm run mcp
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CLUSTERS, planMigration } from "@/lib/migration/migration";
import { SEED } from "@/lib/fabric/seed";
import { edgesFrom } from "@/lib/fabric";
import { migrationHistory, recordMigration } from "@/lib/agents/memory";
import { shortestPath } from "@/lib/graph/algorithms";
import { getString, getTypes, iri, labelOf } from "@/lib/protocol";

const server = new McpServer({ name: "agennext-mcp", version: "1.0.0" });

server.tool("list_clusters", "List known Kubernetes clusters and their inventory", {}, async () => ({
  content: [{ type: "text", text: JSON.stringify(Object.values(CLUSTERS), null, 2) }],
}));

server.tool(
  "migration_plan",
  "Plan a Kubernetes migration from a source cluster to a target distro",
  { source: z.string(), target: z.enum(["k3s", "microk8s", "talos", "eks", "gke", "aks"]) },
  async ({ source, target }) => {
    const cluster = CLUSTERS[source];
    if (!cluster) {
      return { content: [{ type: "text", text: `Unknown source cluster: ${source}` }], isError: true };
    }
    return { content: [{ type: "text", text: JSON.stringify(planMigration(cluster, target), null, 2) }] };
  },
);

server.tool(
  "migration_run",
  "Plan a migration AND record it to shared agent memory (SurrealDB/file)",
  { source: z.string(), target: z.enum(["k3s", "microk8s", "talos", "eks", "gke", "aks"]) },
  async ({ source, target }) => {
    const cluster = CLUSTERS[source];
    if (!cluster) {
      return { content: [{ type: "text", text: `Unknown source cluster: ${source}` }], isError: true };
    }
    const plan = planMigration(cluster, target);
    const memoryId = await recordMigration(plan);
    return { content: [{ type: "text", text: JSON.stringify({ memoryId, plan }, null, 2) }] };
  },
);

server.tool("migration_history", "List recent migration runs from shared memory", {}, async () => ({
  content: [{ type: "text", text: JSON.stringify(await migrationHistory(), null, 2) }],
}));

server.tool(
  "graph_query",
  "Query the Schema.org knowledge graph by type and/or text",
  { type: z.string().optional(), text: z.string().optional() },
  async ({ type, text }) => {
    const items = SEED.filter((n) => {
      if (type && !getTypes(n).includes(type)) return false;
      if (text) {
        const hay = `${getString(n, "name") ?? ""} ${getString(n, "description") ?? ""}`.toLowerCase();
        if (!hay.includes(text.toLowerCase())) return false;
      }
      return true;
    }).map((n) => ({ id: n["@id"], type: getTypes(n)[0], name: labelOf(n) }));
    return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
  },
);

server.tool(
  "find_path",
  "Shortest path between two graph nodes (by slug)",
  { from: z.string(), to: z.string() },
  async ({ from, to }) => {
    const ids = new Set(SEED.map((n) => n["@id"]));
    const edges = SEED.flatMap(edgesFrom).filter((e) => ids.has(e.to));
    const path = shortestPath(edges, iri(from), iri(to));
    return { content: [{ type: "text", text: path ? JSON.stringify(path, null, 2) : "no route" }] };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("agennext-mcp server ready (stdio)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
