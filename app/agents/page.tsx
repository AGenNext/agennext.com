import { getFabric } from "@/lib/fabric";
import { getString, getTypes, labelOf, slugOf } from "@/lib/protocol";
import { AgentsRunner, type NodeOption } from "@/components/AgentsRunner";
import { NodeCard, SectionLabel } from "@/components/ui";

export const dynamic = "force-dynamic";

/** Where agents work: run graph-native agents over the data fabric. */
export default async function AgentsPage() {
  const items = (await getFabric().query({})).items;

  const nodeOptions: NodeOption[] = items
    .map((n) => {
      const slug = slugOf(n["@id"]);
      return slug ? { slug, label: labelOf(n), type: getTypes(n)[0] } : null;
    })
    .filter((x): x is NodeOption => x !== null)
    .sort((a, b) => a.label.localeCompare(b.label));

  const agents = items.filter((n) => getString(n, "applicationCategory") === "Agent");

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Where agents work — graph-native agents that reason over the Schema.org data fabric:
        traversal, shortest-path routing, and research briefs.
      </p>

      {agents.length > 0 && (
        <div className="mt-8">
          <SectionLabel>Installed agents</SectionLabel>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((a) => {
              const slug = slugOf(a["@id"]);
              return (
                <NodeCard
                  key={a["@id"]}
                  href={slug ? `/thing/${slug}` : a["@id"]}
                  type="Agent"
                  title={labelOf(a)}
                  description={getString(a, "description")}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-10">
        <SectionLabel>Run</SectionLabel>
        <div className="mt-4">
          <AgentsRunner nodes={nodeOptions} />
        </div>
      </div>
    </div>
  );
}
