import { allTypes, allProperties, vocabularyStats } from "@/lib/schema/org";
import { EntityBrowser, type BrowserItem } from "@/components/EntityBrowser";
import { SectionLabel, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * The complete schema.org meta-model, loaded from the vendored vocabulary.
 * Classes and properties are browsable/searchable; each links to schema.org.
 */
export default function SchemaPage() {
  const { classes, properties } = vocabularyStats();

  const typeItems: BrowserItem[] = allTypes().map((t) => ({
    id: `type:${t.name}`,
    href: `https://schema.org/${t.name}`,
    type: "Type",
    title: t.name,
    description: t.comment,
    keywords: t.parent ?? "",
  }));

  const propItems: BrowserItem[] = allProperties().map((p) => ({
    id: `prop:${p.name}`,
    href: `https://schema.org/${p.name}`,
    type: "Property",
    title: p.name,
    description: p.comment,
    keywords: `${p.domain.join(" ")} ${p.range.join(" ")}`,
  }));

  const items = [...typeItems, ...propItems];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Schema.org meta-model</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        The full schema.org vocabulary backs the platform&apos;s type system — loaded as Linked
        Data, with class hierarchy and property domain/range edges. Search across every type and
        property.
      </p>

      <div className="mt-6 grid max-w-md grid-cols-3 gap-3">
        <Stat label="classes" value={classes} />
        <Stat label="properties" value={properties} />
        <Stat label="total" value={classes + properties} />
      </div>

      <div className="mt-10">
        <SectionLabel>Vocabulary</SectionLabel>
        <div className="mt-4">
          <EntityBrowser items={items} placeholder="Search types & properties…" limit={60} />
        </div>
      </div>
    </div>
  );
}
