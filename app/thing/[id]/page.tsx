import Link from "next/link";
import { notFound } from "next/navigation";
import { getFabric } from "@/lib/fabric";
import { JsonLd } from "@/components/JsonLd";
import {
  getString,
  getTypes,
  isReference,
  iri,
  labelOf,
  slugOf,
  type Edge,
  type GraphNode,
} from "@/lib/protocol";
import { ancestry, INVERSE_LABEL, typeIri } from "@/lib/schema/org";

export const dynamic = "force-dynamic";

function labelFor(nodes: Map<string, GraphNode>, id: string): string {
  const n = nodes.get(id);
  return n ? labelOf(n) : id;
}

function thingHref(id: string): string {
  const slug = slugOf(id);
  return slug ? `/thing/${slug}` : id;
}

/** Render a literal property row, skipping references (shown as edges). */
function literalRows(node: GraphNode) {
  const rows: Array<[string, string]> = [];
  for (const [prop, value] of Object.entries(node)) {
    if (prop.startsWith("@")) continue;
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      if (isReference(v)) continue;
      if (v === undefined) continue;
      rows.push([prop, String(v)]);
    }
  }
  return rows;
}

export default async function ThingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fabric = getFabric();
  const result = await fabric.node(iri(id));
  if (!result) notFound();

  const { node, outgoing, incoming } = result;
  const all = (await fabric.query({})).items;
  const byId = new Map(all.map((n) => [n["@id"], n]));

  const types = getTypes(node);
  const primary = types[0];
  const label = labelOf(node);
  const description = getString(node, "description");

  const renderEdge = (e: Edge, dir: "out" | "in") => {
    const otherId = dir === "out" ? e.to : e.from;
    const verb = dir === "out" ? e.property : INVERSE_LABEL[e.property] ?? `${e.property} of`;
    return (
      <li key={`${dir}-${e.from}-${e.property}-${e.to}`} className="flex items-baseline gap-2">
        <span className="font-mono text-xs text-muted">{verb}</span>
        <Link href={thingHref(otherId)} className="text-accent hover:underline">
          {labelFor(byId, otherId)}
        </Link>
      </li>
    );
  };

  return (
    <article
      className="mx-auto max-w-4xl px-6 py-12"
      itemScope
      itemType={typeIri(primary)}
    >
      {/* Machine-readable Linked Data for this entity. */}
      <JsonLd data={node as unknown as Record<string, unknown>} />

      <nav className="text-xs text-muted">
        <Link href="/" className="hover:text-foreground">
          Explore
        </Link>{" "}
        / {primary}
      </nav>

      <header className="mt-3">
        <div className="flex flex-wrap gap-2">
          {types.map((t) => (
            <span key={t} className="pill px-2 py-0.5 text-[11px] text-accent">
              {t}
            </span>
          ))}
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight" itemProp="name">
          {label}
        </h1>
        {description && (
          <p className="mt-3 text-muted" itemProp="description">
            {description}
          </p>
        )}
        <p className="mt-3 font-mono text-xs text-muted">{node["@id"]}</p>
        <p className="mt-1 text-xs text-muted">
          schema.org type chain: {ancestry(primary).join(" → ")}
        </p>
      </header>

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Properties</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {literalRows(node).map(([prop, value], i) => (
              <div key={`${prop}-${i}`} className="grid grid-cols-[8rem_1fr] gap-3">
                <dt className="font-mono text-xs text-muted">{prop}</dt>
                <dd itemProp={prop}>
                  {/^https?:\/\//.test(value) ? (
                    <a href={value} className="text-accent hover:underline break-all">
                      {value}
                    </a>
                  ) : (
                    value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Relationships
          </h2>
          {outgoing.length > 0 && (
            <>
              <h3 className="mt-3 text-xs text-muted">Outgoing</h3>
              <ul className="mt-1 space-y-1 text-sm">
                {outgoing.map((e) => renderEdge(e, "out"))}
              </ul>
            </>
          )}
          {incoming.length > 0 && (
            <>
              <h3 className="mt-4 text-xs text-muted">Incoming</h3>
              <ul className="mt-1 space-y-1 text-sm">
                {incoming.map((e) => renderEdge(e, "in"))}
              </ul>
            </>
          )}
          {outgoing.length === 0 && incoming.length === 0 && (
            <p className="mt-3 text-sm text-muted">No relationships.</p>
          )}
        </section>
      </div>

      <div className="mt-10">
        <a href={`/api/graph/${id}`} className="font-mono text-xs text-accent hover:underline">
          GET /api/graph/{id}
        </a>
      </div>
    </article>
  );
}
