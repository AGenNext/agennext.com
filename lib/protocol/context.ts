/**
 * Protocol-first: the JSON-LD context is the contract.
 *
 * Every entity that crosses a boundary in AGenNext is a Schema.org node
 * serialized as JSON-LD. The graph vocabulary IS schema.org; the only
 * additions live under the `agennext:` prefix for platform-internal terms.
 */

/** Canonical schema.org vocabulary IRI. */
export const SCHEMA_ORG = "https://schema.org/" as const;

/** Namespace for AGenNext-specific terms not covered by schema.org. */
export const AGENNEXT_NS = "https://agennext.com/ns#" as const;

/** Base IRI under which every local graph node is minted. */
export const NODE_BASE = "https://agennext.com/id/" as const;

/**
 * The JSON-LD `@context` shared by every protocol message and every
 * rendered page. `@vocab` defaults bare property names to schema.org so
 * documents stay terse while remaining unambiguous Linked Data.
 */
export const JSONLD_CONTEXT = {
  "@vocab": SCHEMA_ORG,
  agennext: AGENNEXT_NS,
  id: "@id",
  type: "@type",
} as const;

/** Mint a fully-qualified node IRI from a local slug. */
export function iri(slug: string): string {
  return `${NODE_BASE}${slug}`;
}

/** Resolve a node IRI back to its local slug, or `null` if foreign. */
export function slugOf(id: string): string | null {
  return id.startsWith(NODE_BASE) ? id.slice(NODE_BASE.length) : null;
}
