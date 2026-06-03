import Link from "next/link";
import { getFabric } from "@/lib/fabric";
import { getString, getTypes, labelOf, slugOf } from "@/lib/protocol";
import { allTypes } from "@/lib/schema/org";

export const dynamic = "force-dynamic";

const CAPABILITIES = [
  { k: "Protocol-first", v: "A versioned JSON-LD contract precedes every UI and store." },
  { k: "Schema.org graph", v: "Nodes are Things; edges are schema.org properties." },
  { k: "Data fabric", v: "Schemaless connectors unify sources (in-memory, SurrealDB)." },
  { k: "Linked-Data HTML", v: "Entities render as semantic HTML + embedded JSON-LD." },
  { k: "Cloud-native", v: "12-factor, containerized, liveness/readiness probes." },
  { k: "Observability", v: "OpenTelemetry-shaped traces, metrics, OpenMetrics scrape." },
  { k: "SPIFFE identity", v: "Workloads named by SPIFFE ID; writes are identity-gated." },
  { k: "OpenFeature flags", v: "Provider-based flags toggle connectors and the write API." },
];

export default async function Home() {
  const fabric = getFabric();
  const { items, total } = await fabric.query({});
  const connectors = fabric.connectorInfo();

  const counts = new Map<string, number>();
  for (const n of items) for (const t of getTypes(n)) counts.set(t, (counts.get(t) ?? 0) + 1);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <section className="max-w-3xl">
        <p className="pill inline-block px-3 py-1 text-xs text-muted">
          open · protocol-first · cloud-native
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          A Schema.org data fabric
          <span className="block text-muted">you can query and crawl.</span>
        </h1>
        <p className="mt-5 text-lg text-muted">
          AGenNext unifies your sources into one Schema.org knowledge graph. Every entity is
          available as a protocol response <em>and</em> as Linked-Data HTML — instrumented with
          OpenTelemetry and secured with SPIFFE identity.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/console"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background"
          >
            Open the console
          </Link>
          <a
            href="/api/graph"
            className="rounded-lg border border-border px-4 py-2 text-sm font-mono"
          >
            GET /api/graph
          </a>
        </div>
      </section>

      <section className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CAPABILITIES.map((c) => (
          <div key={c.k} className="card p-4">
            <div className="text-sm font-medium">{c.k}</div>
            <div className="mt-1 text-xs text-muted">{c.v}</div>
          </div>
        ))}
      </section>

      <section className="mt-14 grid gap-8 lg:grid-cols-[1fr_2fr]">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Graph · {total} nodes
          </h2>
          <ul className="mt-3 space-y-1 text-sm">
            {[...counts.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([type, n]) => (
                <li key={type} className="flex justify-between">
                  <span>{type}</span>
                  <span className="text-muted">{n}</span>
                </li>
              ))}
          </ul>
          <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted">
            Connectors
          </h3>
          <ul className="mt-3 space-y-1 text-sm">
            {connectors.map((c) => (
              <li key={c.id} className="flex justify-between">
                <span>{c.name}</span>
                <span className="text-muted">{c.writable ? "rw" : "ro"}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-muted">
            {allTypes().length} schema.org types are annotated; any other term is accepted.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Entities</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {items.map((n) => {
              const slug = slugOf(n["@id"]);
              const label = labelOf(n);
              const desc = getString(n, "description");
              return (
                <Link
                  key={n["@id"]}
                  href={slug ? `/thing/${slug}` : n["@id"]}
                  className="card p-4 transition hover:border-accent"
                >
                  <div className="flex items-center gap-2">
                    <span className="pill px-2 py-0.5 text-[11px] text-accent">
                      {getTypes(n)[0]}
                    </span>
                  </div>
                  <div className="mt-2 font-medium">{label}</div>
                  {desc && <div className="mt-1 line-clamp-2 text-xs text-muted">{desc}</div>}
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
