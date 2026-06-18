import { createRequire } from "node:module";

/**
 * The complete schema.org meta-model, loaded from the vendored `schemaorg-jsonld`
 * vocabulary (no network egress required). Exposes the full ~581 classes and
 * ~832 properties with their subClassOf / domainIncludes / rangeIncludes edges,
 * replacing the former hand-curated subset.
 *
 * Server-only: loaded lazily via require so the 744KB JSON never lands in a
 * client bundle nor inflates the TypeScript program.
 */

const SCHEMA = "http://schema.org/";
const RDFS = "http://www.w3.org/2000/01/rdf-schema#";
const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";

interface RdfNode {
  "@id": string;
  "@type"?: string | string[];
  [key: string]: unknown;
}

export interface ClassDef {
  name: string;
  comment: string;
  parents: string[];
}
export interface PropertyDef {
  name: string;
  comment: string;
  domain: string[];
  range: string[];
}

interface Vocab {
  classes: Map<string, ClassDef>;
  properties: Map<string, PropertyDef>;
  subtypes: Map<string, string[]>;
  propsByDomain: Map<string, string[]>;
}

let vocab: Vocab | null = null;

function localName(iri: string): string {
  return iri.startsWith(SCHEMA) ? iri.slice(SCHEMA.length) : iri;
}
function refIds(value: unknown): string[] {
  if (!value) return [];
  return ([] as RdfNode[])
    .concat(value as RdfNode[])
    .map((x) => (x && x["@id"] ? localName(String(x["@id"])) : ""))
    .filter(Boolean);
}
function literal(value: unknown): string {
  const arr = ([] as { "@value"?: string }[]).concat(value as { "@value"?: string }[]);
  return arr[0]?.["@value"] ?? "";
}
function push(map: Map<string, string[]>, key: string, val: string): void {
  const list = map.get(key);
  if (list) list.push(val);
  else map.set(key, [val]);
}

function load(): Vocab {
  if (vocab) return vocab;
  const require = createRequire(import.meta.url);
  const graph = require("schemaorg-jsonld/schema.json") as RdfNode[];

  const classes = new Map<string, ClassDef>();
  const properties = new Map<string, PropertyDef>();
  const subtypes = new Map<string, string[]>();
  const propsByDomain = new Map<string, string[]>();

  for (const node of graph) {
    const id = String(node["@id"] ?? "");
    if (!id.startsWith(SCHEMA)) continue;
    const types = ([] as string[]).concat((node["@type"] as string[]) ?? []);
    const name = localName(id);
    if (types.includes(`${RDFS}Class`)) {
      classes.set(name, {
        name,
        comment: literal(node[`${RDFS}comment`]),
        parents: refIds(node[`${RDFS}subClassOf`]),
      });
    } else if (types.includes(`${RDF}Property`)) {
      properties.set(name, {
        name,
        comment: literal(node[`${RDFS}comment`]),
        domain: refIds(node[`${SCHEMA}domainIncludes`]),
        range: refIds(node[`${SCHEMA}rangeIncludes`]),
      });
    }
  }

  for (const c of classes.values()) for (const p of c.parents) push(subtypes, p, c.name);
  for (const p of properties.values()) for (const d of p.domain) push(propsByDomain, d, p.name);

  vocab = { classes, properties, subtypes, propsByDomain };
  return vocab;
}

export function vocabularyStats(): { classes: number; properties: number } {
  const v = load();
  return { classes: v.classes.size, properties: v.properties.size };
}

export function classDef(name: string): ClassDef | undefined {
  return load().classes.get(name);
}
export function allClasses(): ClassDef[] {
  return [...load().classes.values()];
}
export function propertyDef(name: string): PropertyDef | undefined {
  return load().properties.get(name);
}
export function allProperties(): PropertyDef[] {
  return [...load().properties.values()];
}
export function subtypesOf(name: string): string[] {
  return load().subtypes.get(name) ?? [];
}

/** Primary-parent chain from the type up to its root (e.g. Thing). */
export function ancestry(name: string): string[] {
  const v = load();
  const chain: string[] = [];
  const seen = new Set<string>();
  let cur: string | undefined = name;
  while (cur && !seen.has(cur)) {
    chain.push(cur);
    seen.add(cur);
    cur = v.classes.get(cur)?.parents[0];
  }
  return chain;
}

/** All transitive ancestors (follows multiple inheritance). */
export function allAncestors(name: string): Set<string> {
  const v = load();
  const out = new Set<string>();
  const stack = [name];
  while (stack.length) {
    const x = stack.pop()!;
    if (out.has(x)) continue;
    out.add(x);
    for (const p of v.classes.get(x)?.parents ?? []) stack.push(p);
  }
  return out;
}

export function isA(type: string, ancestor: string): boolean {
  return allAncestors(type).has(ancestor);
}

/** Property names applicable to a type (its domain + inherited from ancestors). */
export function propertiesForType(name: string): string[] {
  const v = load();
  const out = new Set<string>();
  for (const t of allAncestors(name)) for (const p of v.propsByDomain.get(t) ?? []) out.add(p);
  return [...out].sort();
}
