import { inTrustDomain, parseSpiffeId, type SpiffeId } from "./spiffe";
import { log } from "@/lib/observability";

/**
 * Request authentication → a SPIFFE principal.
 *
 * SECURITY: a forwarded identity (an `X-Spiffe-Id` header or a JWT-SVID bearer)
 * is only as trustworthy as the proxy in front of the app. A header is trivially
 * forgeable, and we do not verify JWT signatures here. So forwarded identity is
 * **ignored by default** and only honored when `TRUST_FORWARDED_IDENTITY=true` —
 * which an operator must set ONLY after ensuring an upstream mesh/proxy (Envoy +
 * SPIRE) strips client-supplied copies of these headers and verifies SVIDs.
 * `DEV_SPIFFE_ID` is an operator-set (not client-controllable) local escape hatch.
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

/** Whether to trust proxy-forwarded identity (header / JWT-SVID). Off by default. */
function forwardedIdentityTrusted(): boolean {
  const v = process.env.TRUST_FORWARDED_IDENTITY;
  return v === "true" || v === "1";
}

/** Decode (NOT verify) a JWT payload. Only used when forwarded identity is trusted. */
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
  // Proxy-forwarded identity is forgeable; honor it only when explicitly trusted.
  if (forwardedIdentityTrusted()) {
    // Mesh-injected peer identity (the proxy must strip client-supplied copies).
    const header = req.headers.get("x-spiffe-id");
    if (header) {
      const p = accept(header, "header");
      if (p) return p;
    }
    // JWT-SVID bearer (signature verified upstream by the mesh/SPIRE).
    const authz = req.headers.get("authorization");
    if (authz?.startsWith("Bearer ")) {
      const claims = decodeJwtClaims(authz.slice(7));
      if (claims?.sub && (!claims.exp || claims.exp * 1000 > Date.now())) {
        const p = accept(claims.sub, "jwt-svid");
        if (p) return p;
      }
    }
  }

  // Operator-set local escape hatch (not client-controllable).
  const dev = process.env.DEV_SPIFFE_ID;
  if (dev) {
    const p = accept(dev, "dev");
    if (p) return p;
  }

  return null;
}
