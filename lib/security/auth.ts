import { inTrustDomain, parseSpiffeId, type SpiffeId } from "./spiffe";
import { log } from "@/lib/observability";

/**
 * Request authentication → a SPIFFE principal.
 *
 * In a SPIFFE deployment, mTLS terminates at the mesh/proxy (Envoy + SPIRE)
 * and the verified peer identity is forwarded to the app. We therefore trust
 * a mesh-injected identity header, or a JWT-SVID bearer whose signature the
 * mesh has already verified. Cryptographic verification is the mesh's job;
 * this layer parses the asserted identity and enforces the trust domain.
 *
 * Returns `null` for anonymous callers (no/!valid identity).
 */
export interface Principal {
  id: SpiffeId;
  /** How the identity was asserted, for audit logs. */
  via: "header" | "jwt-svid" | "dev";
}

interface JwtClaims {
  sub?: string;
  exp?: number;
}

/** Decode (NOT verify) a JWT payload. Verification is delegated to the mesh. */
function decodeJwtClaims(token: string): JwtClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(json) as JwtClaims;
  } catch {
    return null;
  }
}

function accept(value: string, via: Principal["via"]): Principal | null {
  try {
    const id = parseSpiffeId(value);
    if (!inTrustDomain(id)) {
      log.warn("auth.foreign_trust_domain", { id: id.toString(), via });
      return null;
    }
    return { id, via };
  } catch {
    return null;
  }
}

export function authenticate(req: Request): Principal | null {
  // 1. Mesh-injected, already-verified peer identity.
  const header = req.headers.get("x-spiffe-id");
  if (header) {
    const p = accept(header, "header");
    if (p) return p;
  }

  // 2. JWT-SVID bearer (signature pre-verified by the mesh/SPIRE).
  const authz = req.headers.get("authorization");
  if (authz?.startsWith("Bearer ")) {
    const claims = decodeJwtClaims(authz.slice(7));
    if (claims?.sub && (!claims.exp || claims.exp * 1000 > Date.now())) {
      const p = accept(claims.sub, "jwt-svid");
      if (p) return p;
    }
  }

  // 3. Dev escape hatch for local runs without a mesh.
  const dev = process.env.DEV_SPIFFE_ID;
  if (dev) {
    const p = accept(dev, "dev");
    if (p) return p;
  }

  return null;
}
