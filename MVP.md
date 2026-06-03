# AGenNext — Kubernetes-native AI Operations Platform (MVP)

An open-source, Kubernetes-native AI operations platform: multi-agent systems
with persistent memory that automate cluster management, infrastructure, and
migrations — over a Schema.org data fabric.

## Six pillars

| Pillar | Status in this repo |
| --- | --- |
| 1. **Kubernetes Migration Agent** (k3s ↔ MicroK8s, EKS/GKE/AKS) | ✅ prototype — discovery → plan → validate → rollback |
| 2. **Agent Builder Framework** (SDK, tool registry, workflow, memory) | ◑ Agent Runtime + building blocks (templates/skills/tools/knowledge) |
| 3. **Multi-Agent Orchestration** (Planner, DevOps, Security, Migration, Validation, Docs) | ◑ Research, Operations, Kubernetes, Operator, Migration agents |
| 4. **SurrealDB Memory** (long-term memory, knowledge graph, inventory, history) | ✅ SurrealDB connector (default backend) + Schema.org graph |
| 5. **MCP Server** (Kubernetes, Helm, Git, Terraform, SSH, SurrealDB, monitoring) | ◑ `mcp/server.ts` — migration + graph tools; infra tools next |
| 6. **Headlamp Extension** (chat, dashboard, migration wizard, workflow viz, memory explorer) | ◑ `extensions/headlamp/` scaffold |

## Repository structure

```
agennext.com/
├── app/                      Next.js UI + protocol API
│   ├── agents/               agent runners (incl. Migration Wizard)
│   ├── api/agents/*          agent endpoints (research, operations, k8s,
│   │                         operator, migration) + /api/agents catalog
│   └── api/{graph,path,...}   data-fabric + graph-algorithm endpoints
├── lib/
│   ├── agents/               Agent Runtime (registry) + the agents
│   ├── migration/            cluster inventory model + migration planner
│   ├── fabric/               schemaless data fabric (memory · file · SurrealDB)
│   ├── graph/                graph algorithms (routes, neighborhoods)
│   ├── schema/               full schema.org meta-model
│   ├── security/             SPIFFE auth · Permify authz · IAM
│   └── observability/        OpenTelemetry
├── mcp/                      MCP server (stdio) — tool surface for agents
├── extensions/headlamp/      Headlamp (Kubernetes UI) plugin
├── proto/                    protobuf contract (agennext/v1)
└── deploy/                   Dockerfile · k8s · Crossplane · Flux
```

## First working prototype (this slice)

- **Migration Agent** — `lib/migration/`, `lib/agents/migration.ts`,
  `POST /api/agents/migration`, runner UI on `/agents`, tested.
- **MCP Server** — `npm run mcp` exposes `list_clusters`, `migration_plan`,
  `graph_query`, `find_path`.
- **SurrealDB memory** — the fabric's default backend (`SURREAL_URL`).
- **Headlamp plugin** — scaffold under `extensions/headlamp/`.

## Roadmap to MVP

1. MCP infra tools: `kubernetes`, `helm`, `git`, `terraform`, `ssh`, `monitoring`.
2. Migration Agent executes plans (not just proposes) via the MCP tools.
3. Memory: persist cluster inventory + migration history to SurrealDB.
4. Orchestration: Planner dispatches Migration → Validation → Documentation.
5. Headlamp: wire the five panels to the live API.
