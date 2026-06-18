/**
 * SPIFFE-compliant workload identity.
 *
 * Every workload and connector in AGenNext is named by a SPIFFE ID
 * (`spiffe://<trust-domain>/<path>`), per the SPIFFE specification. This
 * module parses/validates SPIFFE IDs and models the SVID an identity would
 * present. It is transport-agnostic: a real deployment fronts workloads with
 * SPIRE + mTLS; here we carry the verified identity in-process.
 */

export interface SpiffeId {
  trustDomain: string;
  path: string; // begins with "/"
  toString(): string;
}

/** The platform's trust domain (overridable via env). */
export function trustDomain(): string {
  return process.env.SPIFFE_TRUST_DOMAIN ?? "agennext.com";
}

const SPIFFE_RE = /^spiffe:\/\/([a-z0-9._-]+)(\/[A-Za-z0-9._/~%+-]*)?$/;

/** Parse and validate a SPIFFE ID string. Throws on malformed input. */
export function parseSpiffeId(value: string): SpiffeId {
  const m = SPIFFE_RE.exec(value);
  if (!m) throw new Error(`Invalid SPIFFE ID: ${value}`);
  const [, td, path = "/"] = m;
  return {
    trustDomain: td,
    path: path === "" ? "/" : path,
    toString: () => `spiffe://${td}${path === "/" ? "" : path}`,
  };
}

/** Build a SPIFFE ID in the platform trust domain for a workload path. */
export function workloadId(path: string): SpiffeId {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return parseSpiffeId(`spiffe://${trustDomain()}${clean}`);
}

/** True iff the id belongs to the platform's trust domain. */
export function inTrustDomain(id: SpiffeId): boolean {
  return id.trustDomain === trustDomain();
}

/**
 * A minimal SVID-like assertion. In production this is an X.509-SVID or
 * JWT-SVID issued by SPIRE; here it carries the verified SPIFFE ID and an
 * expiry so authorization code has a single shape to reason about.
 */
export interface Svid {
  id: SpiffeId;
  expiresAt: number;
}

export function svidFor(path: string, ttlSeconds = 3600): Svid {
  return { id: workloadId(path), expiresAt: Date.now() + ttlSeconds * 1000 };
}

export function svidValid(svid: Svid): boolean {
  return svid.expiresAt > Date.now() && inTrustDomain(svid.id);
}
