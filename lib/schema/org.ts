/**
 * A curated, typed slice of the schema.org vocabulary.
 *
 * The full vocabulary (https://schema.org/docs/full.html) is ~800 types and
 * ~1400 properties. We don't vendor all of it; we capture the subset the
 * platform reasons about — enough to label types, validate a node's shape,
 * and drive the explorer UI — and treat any other schema.org term as valid
 * but unannotated.
 */

export interface TypeDef {
  /** schema.org type name, e.g. "Organization". */
  name: string;
  /** Direct supertype in the schema.org hierarchy, or null for Thing. */
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

const TYPES: TypeDef[] = [
  { name: "Thing", parent: null, comment: "The most generic type of item." },
  { name: "Intangible", parent: "Thing", comment: "A utility class for non-physical things." },
  { name: "Organization", parent: "Thing", comment: "An organization such as a company or project." },
  { name: "Person", parent: "Thing", comment: "A person (alive, dead, fictional)." },
  { name: "CreativeWork", parent: "Thing", comment: "The most generic kind of creative work." },
  { name: "WebSite", parent: "CreativeWork", comment: "A website." },
  { name: "WebPage", parent: "CreativeWork", comment: "A web page." },
  { name: "TechArticle", parent: "CreativeWork", comment: "A technical article such as a spec or how-to." },
  { name: "SoftwareApplication", parent: "CreativeWork", comment: "A software application." },
  { name: "SoftwareSourceCode", parent: "CreativeWork", comment: "Computer programming source code." },
  { name: "Dataset", parent: "CreativeWork", comment: "A body of structured information." },
  { name: "DefinedTerm", parent: "Intangible", comment: "A word, name or concept defined in a vocabulary." },
  { name: "Service", parent: "Intangible", comment: "A provided service." },
];

const BY_NAME = new Map(TYPES.map((t) => [t.name, t]));

export function typeDef(name: string): TypeDef | undefined {
  return BY_NAME.get(name);
}

export function allTypes(): TypeDef[] {
  return [...TYPES];
}

/** Ancestor chain from the type up to (and including) Thing. */
export function ancestry(name: string): string[] {
  const chain: string[] = [];
  let cur: string | null = name;
  while (cur) {
    chain.push(cur);
    cur = BY_NAME.get(cur)?.parent ?? null;
  }
  return chain;
}

/** True if `type` is `ancestor` or transitively derives from it. */
export function isA(type: string, ancestor: string): boolean {
  return ancestry(type).includes(ancestor);
}

/** Canonical IRI for a schema.org type, for `@type` resolution + links. */
export function typeIri(name: string): string {
  return `https://schema.org/${name}`;
}
