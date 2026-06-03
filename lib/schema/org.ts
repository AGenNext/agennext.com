/**
 * schema.org type system.
 *
 * The type hierarchy now comes from the complete schema.org meta-model (see
 * `vocabulary.ts`) rather than a hand-curated subset. This module keeps the
 * platform-specific bits — which reference-valued properties become graph
 * edges, their inverse labels, and IRI helpers — and re-exposes the vocabulary
 * lookups under the existing API.
 */
import { allClasses, classDef } from "./vocabulary";

export {
  ancestry,
  allAncestors,
  isA,
  propertiesForType,
  propertyDef,
  allProperties,
  subtypesOf,
  vocabularyStats,
  type ClassDef,
  type PropertyDef,
} from "./vocabulary";

export interface TypeDef {
  name: string;
  parent: string | null;
  comment: string;
}

/** Reference-valued schema.org properties we render as graph edges. */
export const EDGE_PROPERTIES = new Set<string>([
  "author",
  "creator",
  "publisher",
  "founder",
  "worksFor",
  "memberOf",
  "member",
  "parentOrganization",
  "subOrganization",
  "isPartOf",
  "hasPart",
  "about",
  "subjectOf",
  "mainEntity",
  "mainEntityOfPage",
  "knowsAbout",
  "sameAs",
  "provider",
  "sponsor",
  "isBasedOn",
  "citation",
  "relatedLink",
  "offers",
  "itemOffered",
]);

/** Inverse labels so incoming edges read naturally in the UI. */
export const INVERSE_LABEL: Record<string, string> = {
  author: "authored",
  creator: "created",
  publisher: "published",
  founder: "founded",
  worksFor: "employs",
  memberOf: "has member",
  parentOrganization: "parent of",
  isPartOf: "has part",
  hasPart: "part of",
  about: "subject of",
  subjectOf: "is about",
  knowsAbout: "known by",
  provider: "provides",
  sponsor: "sponsors",
};

/** A type definition in the legacy `{ name, parent, comment }` shape. */
export function typeDef(name: string): TypeDef | undefined {
  const c = classDef(name);
  if (!c) return undefined;
  return { name: c.name, parent: c.parents[0] ?? null, comment: c.comment };
}

/** Every schema.org class as a {@link TypeDef}. */
export function allTypes(): TypeDef[] {
  return allClasses().map((c) => ({ name: c.name, parent: c.parents[0] ?? null, comment: c.comment }));
}

/** Canonical IRI for a schema.org type, for `@type` resolution + links. */
export function typeIri(name: string): string {
  return `https://schema.org/${name}`;
}
