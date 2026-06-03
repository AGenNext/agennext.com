# AGenNext Protocol `agennext/1.0`

Protocol-first means this contract is defined before any UI or storage. Every
boundary in the platform — HTTP API, connectors, rendered pages — speaks it.

## Data model

The graph **is** [schema.org](https://schema.org/docs/full.html). There is no
separate platform schema.

- **Node** — a schema.org `Thing` as a JSON-LD document:
  ```json
  {
    "@id": "https://agennext.com/id/agennext",
    "@type": "Organization",
    "name": "AGenNext",
    "founder": { "@id": "https://agennext.com/id/founder" }
  }
  ```
  - `@id` is a stable IRI minted under `https://agennext.com/id/`.
  - `@type` is one or more schema.org type names.
  - Any other key is a schema.org property. Literals are strings/numbers/bools;
    relationships are references `{ "@id": "..." }`.

- **Edge** — derived, not stored: any reference-valued property whose name is in
  the curated `EDGE_PROPERTIES` set becomes a directed edge
  `{ from, property, to }`.

- **Context** — every message and page carries the JSON-LD `@context`
  (`@vocab` → schema.org, plus the `agennext:` prefix).

## Envelope

```json
{ "protocol": "agennext/1.0", "@context": { ... }, "data": <T> }
```

## Operations

| Method & path            | Body / params                     | Returns               |
| ------------------------ | --------------------------------- | --------------------- |
| `GET /api/graph`         | `?type=&text=&limit=&offset=`     | `QueryResult`         |
| `POST /api/graph`        | `{ "query": Query }`              | `QueryResult`         |
| `POST /api/graph`        | `{ "node": GraphNode }`           | upserted node (201)   |
| `GET /api/graph/:slug`   | —                                 | `NodeResult`          |

`Query` fields (`type`, `text`, `ids`, `limit`, `offset`) are all optional and
AND-combined. `NodeResult` is `{ node, outgoing[], incoming[] }`.

## Guarantees

- **Schemaless** — connectors store documents, not columns; SurrealDB and the
  in-memory store are interchangeable.
- **Identity** — writes execute under a SPIFFE workload identity.
- **Flags** — the write path and optional connectors are gated by OpenFeature
  flags.
- **Observable** — every operation is a span; counters/gauges render at
  `/api/metrics` in OpenMetrics format.
