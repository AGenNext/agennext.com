import { getFabric } from "@/lib/fabric";
import { getString, slugOf } from "@/lib/protocol";
import { EntityBrowser, type BrowserItem } from "@/components/EntityBrowser";
import { SectionLabel, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

/** The composable building blocks agents are assembled from. */
const CATEGORIES = new Set(["AgentTemplate", "Skill", "Tool", "Knowledge"]);

export default async function CatalogPage() {
  const all = (await getFabric().query({})).items;
  const blocks = all.filter((n) => CATEGORIES.has(getString(n, "applicationCategory") ?? ""));

  const count = (cat: string) =>
    blocks.filter((n) => getString(n, "applicationCategory") === cat).length;

  const items: BrowserItem[] = blocks.map((n) => {
    const slug = slugOf(n["@id"]) ?? "";
    const cat = getString(n, "applicationCategory") ?? "Block";
    return {
      id: n["@id"],
      href: `/thing/${slug}`,
      type: cat === "AgentTemplate" ? "Template" : cat,
      title: getString(n, "name") ?? slug,
      description: getString(n, "description"),
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Catalog</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        The composable building blocks agents are assembled from — templates, skills, tools, and
        knowledge — modeled as Schema.org nodes and wired together in the graph.
      </p>

      <div className="mt-6 grid max-w-2xl grid-cols-4 gap-3">
        <Stat label="templates" value={count("AgentTemplate")} />
        <Stat label="skills" value={count("Skill")} />
        <Stat label="tools" value={count("Tool")} />
        <Stat label="knowledge" value={count("Knowledge")} />
      </div>

      <div className="mt-10">
        <SectionLabel>Building blocks</SectionLabel>
        <div className="mt-4">
          <EntityBrowser items={items} placeholder="Search templates, skills, tools, knowledge…" />
        </div>
      </div>
    </div>
  );
}
