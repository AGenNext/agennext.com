import Link from "next/link";
import { edgesFrom, getFabric } from "@/lib/fabric";
import { getString, getTypes, labelOf, slugOf } from "@/lib/protocol";
import { GraphView, type GraphEdgeLite, type GraphNodeLite } from "@/components/GraphView";
import { EntityBrowser, type BrowserItem } from "@/components/EntityBrowser";
import { SectionLabel, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Home() {
  const fabric = getFabric();
  const { items, total } = await fabric.query({});
  const ids = new Set(items.map((n) => n["@id"]));

  const typeCount = new Set<string>();
  for (const n of items) for (const t of getTypes(n)) typeCount.add(t);

  const graphNodes: GraphNodeLite[] = items.map((n) => ({
    id: n["@id"],
    slug: slugOf(n["@id"]),
    label: labelOf(n),
    type: getTypes(n)[0],
  }));
  const graphEdges: GraphEdgeLite[] = items
    .flatMap((n) => edgesFrom(n))
    .filter((e) => ids.has(e.to));

  const browserItems: BrowserItem[] = items.map((n) => {
    const slug = slugOf(n["@id"]);
    return {
      id: n["@id"],
      href: slug ? `/thing/${slug}` : n["@id"],
      type: getTypes(n)[0],
      title: labelOf(n),
      description: getString(n, "description"),
      keywords: getString(n, "applicationCategory"),
    };
  });

  return (
    <div>
      <section className="hero-glow border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="pill inline-block px-3 py-1 text-xs text-muted">
            open · protocol-first · cloud-native
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            A Schema.org data fabric you can{" "}
            <span className="text-accent">query, crawl, and operate.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            AGenNext unifies your sources into one Schema.org knowledge graph — available as a
            protocol response and as Linked-Data HTML, instrumented with OpenTelemetry and secured
            with SPIFFE identity.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/admin" className="btn btn-primary">
              Open the admin panel
            </Link>
            <Link href="/stack" className="btn btn-ghost">
              Browse the registry
            </Link>
            <a href="/api/graph" className="btn btn-ghost font-mono">
              GET /api/graph
            </a>
          </div>
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
            <Stat label="nodes" value={total} />
            <Stat label="types" value={typeCount.size} />
            <Stat label="edges" value={graphEdges.length} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <SectionLabel>Knowledge graph</SectionLabel>
        <p className="mt-1 text-sm text-muted">
          Drag nodes, hover to trace relationships, click to open an entity.
        </p>
        <div className="mt-4">
          <GraphView nodes={graphNodes} edges={graphEdges} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <SectionLabel>Entities</SectionLabel>
        <div className="mt-4">
          <EntityBrowser items={browserItems} placeholder="Search the graph…" />
        </div>
      </section>
    </div>
  );
}
