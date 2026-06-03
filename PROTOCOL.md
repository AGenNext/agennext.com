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

## Codegen (protobuf core)

`proto/agennext/v1/fabric.proto` is the typed source of truth. Generate the TS
bindings with:

```bash
npm run proto:gen   # buf generate -> lib/protocol/gen/
```

`lib/protocol/proto.ts` bridges the generated protobuf `Node`/`Query` and the
JSON-LD `GraphNode`/`Query`, so a gRPC transport can speak protobuf while the
app works in JSON-LD. The bridge is covered by a binary round-trip test.

## Authentication & authorization

- **AuthN (SPIFFE)** — the caller's identity is a SPIFFE ID asserted by the
  mesh: either an `X-Spiffe-Id` header (set after mTLS) or a JWT-SVID
  `Authorization: Bearer` token. The trust domain is enforced; foreign
  identities are rejected. `DEV_SPIFFE_ID` provides a local escape hatch.
- **AuthZ (Permify/ReBAC)** — permissions map to relations on the `graph`
  object: `graph:read` ← reader|writer|admin, `graph:write` ← writer|admin.
  Writers are configured via `AUTHZ_WRITERS` (plus the default API writer
  identity).
- **Enforcement** — writes always require `graph:write` (else `401`/`403`).
  Reads are public unless the `public-reads` flag is off, then require
  `graph:read`.

## Guarantees

- **Schemaless** — connectors store documents, not columns; SurrealDB and the
  in-memory store are interchangeable.
- **Identity** — every write is authenticated (SPIFFE) and authorized (ReBAC),
  and audit-logged with the principal.
- **Flags** — the write path and optional connectors are gated by OpenFeature
  flags.
- **Observable** — every operation is a span; counters/gauges render at
  `/api/metrics` in OpenMetrics format.
