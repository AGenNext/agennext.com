import { getFabric } from "@/lib/fabric";
import { getString, slugOf } from "@/lib/protocol";
import { EntityBrowser, type BrowserItem } from "@/components/EntityBrowser";
import { SectionLabel, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

/** AGenNext organization repositories as graph nodes. */
export default async function ReposPage() {
  const repos = (await getFabric().query({ type: "SoftwareSourceCode" })).items.filter(
    (n) => getString(n, "applicationCategory") === "Repository",
  );

  const items: BrowserItem[] = repos.map((n) => {
    const slug = slugOf(n["@id"]) ?? "";
    return {
      id: n["@id"],
      href: `/thing/${slug}`,
      type: getString(n, "programmingLanguage") ?? "Repo",
      title: getString(n, "name") ?? slug,
      description: getString(n, "description"),
      keywords: getString(n, "codeRepository"),
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Repositories</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        The AGenNext organization&apos;s repositories, modeled as Schema.org{" "}
        <code>SoftwareSourceCode</code> nodes in the graph and searchable by language.
      </p>

      <div className="mt-6 grid max-w-xs grid-cols-2 gap-3">
        <Stat label="public repos" value={items.length} />
        <Stat label="org total" value="177" />
      </div>

      <div className="mt-10">
        <SectionLabel>Repositories</SectionLabel>
        <div className="mt-4">
          <EntityBrowser items={items} placeholder="Search repositories…" />
        </div>
      </div>
    </div>
  );
}
