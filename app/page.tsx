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

  const cat = (c: string) => items.filter((n) => getString(n, "applicationCategory") === c).length;
  const blocks = cat("AgentTemplate") + cat("Skill") + cat("Tool") + cat("Knowledge");
  const foundation = items.filter((n) => slugOf(n["@id"])?.startsWith("tech-")).length;
  const pillars = [
    { href: "/agents", label: "Agents", desc: "Autonomous workers over the fabric", count: cat("Agent") },
    { href: "/catalog", label: "Building blocks", desc: "Templates · skills · tools · knowledge", count: blocks },
    { href: "/stack", label: "Registry", desc: "The open, cloud-native foundation", count: foundation },
    { href: "/repos", label: "Repositories", desc: "The org's codebase as a graph", count: cat("Repository") },
  ];

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
            open · enterprise · cloud-native
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            The enterprise hub{" "}
            <span className="text-accent">where agents work.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            Build, run, and govern agents over a Schema.org data fabric — templates, skills, tools,
            and knowledge as composable Linked Data. Protocol-first and self-hostable, observable
            with OpenTelemetry, and secured with SPIFFE identity.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/agents" className="btn btn-primary">
              Run an agent
            </Link>
            <Link href="/catalog" className="btn btn-ghost">
              Browse building blocks
            </Link>
            <a href="/api/agents" className="btn btn-ghost font-mono">
              GET /api/agents
            </a>
          </div>
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
            <Stat label="nodes" value={total} />
            <Stat label="types" value={typeCount.size} />
            <Stat label="edges" value={graphEdges.length} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pt-12">
        <SectionLabel>The hub</SectionLabel>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p) => (
            <Link key={p.href} href={p.href} className="card group p-5 transition hover:border-accent">
              <div className="flex items-baseline justify-between">
                <span className="font-medium group-hover:text-accent">{p.label}</span>
                <span className="text-2xl font-semibold tabular-nums text-accent">{p.count}</span>
              </div>
              <p className="mt-1 text-xs text-muted">{p.desc}</p>
            </Link>
          ))}
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
