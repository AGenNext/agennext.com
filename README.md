# AGenNext

**A protocol-first, cloud-native platform that unifies your sources into a
Schema.org knowledge graph — queryable by protocol and browsable as Linked-Data
HTML.**

The graph *is* [schema.org](https://schema.org/docs/full.html): nodes are
`Thing`s, edges are schema.org properties, everything is JSON-LD. A schemaless
**data fabric** of connectors feeds the graph; the **Next.js** UI renders every
entity as semantic HTML with embedded structured data.

## Architecture

```
            ┌── UI layer (Next.js / React / Tailwind) ──────────────┐
            │  /            explorer      /thing/:id   entity + JSON-LD
            │  /stack       landscape     /console     query console
            └───────────────────────────────────────────────────────┘
                                   │  protocol agennext/1.0 (JSON-LD)
            ┌── API (route handlers) ───────────────────────────────┐
            │  /api/graph   /api/graph/:id                           │
            │  /api/healthz /api/readyz /api/metrics (OpenMetrics)   │
            └───────────────────────────────────────────────────────┘
                                   │
            ┌── Data fabric ────────────────────────────────────────┐
            │  DataFabric → connectors:  MemoryConnector (default)   │
            │                            SurrealConnector (opt-in)   │
            │  cross-cutting:  OpenTelemetry · SPIFFE · OpenFeature  │
            └───────────────────────────────────────────────────────┘
```

See [`PROTOCOL.md`](./PROTOCOL.md) for the wire contract.

## Layers & the projects behind them

| Layer          | Built on                                                        |
| -------------- | -------------------------------------------------------------- |
| Data model     | Schema.org (JSON-LD)                                            |
| Fabric store   | SurrealDB (schemaless), in-memory default                       |
| Observability  | OpenTelemetry, OpenMetrics (scraped by HertzBeat)              |
| Identity       | SPIFFE                                                          |
| Feature flags  | OpenFeature                                                     |
| Cost           | OpenCost-style cost gauge                                       |
| Edge / runtime | KubeEdge, wasmCloud, Layotto                                    |
| ML / pipelines | Kubeflow Pipelines, MLRun                                       |
| Ethos          | Forgejo (open, self-hostable)                                  |

Commercial products (e.g. AI model serving) are integrated as **tools only** —
never part of the open dependency foundation. The `/stack` view shows the split.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
```

By default the graph is **durable**: a file store persists to `DATA_DIR`
(defaults to `.data`) and survives restarts, with forward migrations on load.
For an ephemeral in-memory store (no filesystem writes) set `DATA_STORE=memory`.

```bash
DATA_DIR=/var/lib/agennext npm run dev   # durable at a custom path
DATA_STORE=memory npm run dev            # ephemeral
```

Enable SurrealDB (for scale / multi-replica) with the OpenFeature flag +
connection URL:

```bash
FLAG_SURREAL_CONNECTOR=true SURREAL_URL=http://localhost:8000 npm run dev
```

Enable the write API:

```bash
FLAG_WRITE_API=true npm run dev
```

## Test

```bash
npm test               # fast unit suite (Docker-free)
npm run test:integration   # SurrealDB connector vs a real DB (Testcontainers; needs Docker)
npm run typecheck
```

The integration suite skips automatically when no Docker daemon is present.

## Deploy

Cloud-native by default — `output: "standalone"`, multi-stage `Dockerfile`,
non-root runtime, and liveness/readiness probes.

```bash
docker build -t agennext .
docker run -p 3000:3000 agennext
# or
kubectl apply -f deploy/k8s/deployment.yaml
```

## Endpoints

- `GET /api/graph?type=Organization` — query the graph
- `GET /api/graph/:slug` — a node and its neighbourhood
- `GET /api/healthz` · `GET /api/readyz` — probes
- `GET /api/metrics` — OpenMetrics exposition
