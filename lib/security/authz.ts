import type { Principal } from "./auth";
import { trustDomain, workloadId } from "./spiffe";
import { flags } from "@/lib/flags";

/**
 * Relationship-based access control (Permify / Zanzibar style).
 *
 * Authorization is expressed as relations between subjects and objects, and a
 * permission is satisfied when the subject holds one of the relations the
 * permission maps to. This is a small in-process check; a production
 * deployment can swap it for a real Permify/OpenFGA call behind `can()`
 * without changing call sites.
 */

export type Permission = "graph:read" | "graph:write";
type Relation = "reader" | "writer" | "admin";

/** Which relations satisfy each permission (the schema's permission rules). */
const PERMISSION_RELATIONS: Record<Permission, Relation[]> = {
  "graph:read": ["reader", "writer", "admin"],
  "graph:write": ["writer", "admin"],
};

/** Subjects (SPIFFE IDs) granted the writer relation on the graph. */
function writerSubjects(): Set<string> {
  const subjects = new Set<string>([workloadId("/api/fabric/writer").toString()]);
  for (const s of (process.env.AUTHZ_WRITERS ?? "").split(",")) {
    const id = s.trim();
    if (id) subjects.add(id);
  }
  return subjects;
}

/** Resolve the relations a principal holds on the graph object. */
function relationsFor(principal: Principal | null): Set<Relation> {
  const relations = new Set<Relation>();
  if (!principal) {
    // Anonymous reads are allowed only when the public-reads flag is on.
    if (flags.boolean("public-reads", true)) relations.add("reader");
    return relations;
  }
  // Any verified in-trust-domain workload may read.
  relations.add("reader");
  if (writerSubjects().has(principal.id.toString())) relations.add("writer");
  if (principal.id.path === "/admin") relations.add("admin");
  return relations;
}

/** True if the principal may perform the permission on the graph. */
export function can(principal: Principal | null, permission: Permission): boolean {
  const held = relationsFor(principal);
  return PERMISSION_RELATIONS[permission].some((r) => held.has(r));
}

/** Authorization failure carrying the HTTP status to surface. */
export class AuthzError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403,
  ) {
    super(message);
    this.name = "AuthzError";
  }
}

/** Throw an {@link AuthzError} unless the principal is authorized. */
export function authorize(principal: Principal | null, permission: Permission): void {
  if (can(principal, permission)) return;
  if (!principal) throw new AuthzError(`Authentication required for ${permission}`, 401);
  throw new AuthzError(
    `${principal.id.toString()} is not permitted to ${permission} (trust domain ${trustDomain()})`,
    403,
  );
}
