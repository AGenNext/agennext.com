import { getFabric } from "@/lib/fabric";
import { getString, slugOf } from "@/lib/protocol";
import { EntityBrowser, type BrowserItem } from "@/components/EntityBrowser";
import { SectionLabel } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * Registry / marketplace (Artifact Hub-inspired): a searchable, faceted view
 * of the projects AGenNext is built on, drawn straight from the graph.
 */
const COMMERCIAL_TOOLS = new Set(["tech-ai-platform"]);

export default async function RegistryPage() {
  const apps = (await getFabric().query({ type: "SoftwareApplication" })).items;
  const stack = apps.filter((n) => slugOf(n["@id"])?.startsWith("tech-"));

  const items: BrowserItem[] = stack.map((n) => {
    const slug = slugOf(n["@id"]) ?? "";
    const category = getString(n, "applicationCategory") ?? "Component";
    const commercial = COMMERCIAL_TOOLS.has(slug);
    return {
      id: n["@id"],
      href: `/thing/${slug}`,
      type: category,
      title: getString(n, "name") ?? slug,
      description: getString(n, "description"),
      keywords: commercial ? "commercial tool" : "open foundation",
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Registry</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        The open, cloud-native foundation AGenNext is built on — searchable by name or category.
        Commercial products are listed as tools only, never part of the dependency foundation.
      </p>
      <div className="mt-8">
        <SectionLabel>{items.length} components</SectionLabel>
        <div className="mt-4">
          <EntityBrowser items={items} placeholder="Search the registry…" />
        </div>
      </div>
    </div>
  );
}
