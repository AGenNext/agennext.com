import { JSONLD_CONTEXT } from "@/lib/protocol";

/**
 * Embeds a node as `<script type="application/ld+json">` so every entity
 * page ships machine-readable Schema.org Linked Data alongside its HTML.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const doc = { "@context": JSONLD_CONTEXT, ...data };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(doc) }}
    />
  );
}
