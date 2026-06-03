import { getFabric } from "@/lib/fabric";
import { flags, FLAGS } from "@/lib/flags";
import { trustDomain } from "@/lib/security/spiffe";

/**
 * Control-plane model.
 *
 * AGenNext is operated as a Crossplane-style control plane: a single
 * declarative API (the `AgennextPlatform` composite resource) describes the
 * desired state, and a reconcile loop drives the observed state toward it.
 * This module assembles both sides from live configuration so the Control
 * Panel renders the same shape Crossplane reconciles in-cluster.
 *
 * See `deploy/crossplane/` for the XRD, Composition and example claim.
 */

export interface PlatformSpec {
  image: string;
  replicas: number;
  connector: "memory" | "surreal";
  surrealUrl: string | null;
  writeApi: boolean;
  trustDomain: string;
}

export type Condition = "Ready" | "Pending" | "Degraded";

export interface ManagedResource {
  kind: string;
  name: string;
  /** Crossplane-style readiness for the composed resource. */
  condition: Condition;
  detail?: string;
}

export interface PlatformObserved {
  condition: Condition;
  nodes: number;
  resources: ManagedResource[];
}

export interface ControlState {
  /** Desired state — the composite resource spec. */
  spec: PlatformSpec;
  /** Observed state — the reconciled status. */
  status: PlatformObserved;
}

/** Read the desired spec from the same env/flags the deployment consumes. */
export function desiredSpec(): PlatformSpec {
  const surreal = flags.boolean(FLAGS.SURREAL_CONNECTOR, false);
  return {
    image: process.env.PLATFORM_IMAGE ?? "ghcr.io/agennext/agennext.com:latest",
    replicas: Number(process.env.PLATFORM_REPLICAS ?? 2),
    connector: surreal ? "surreal" : "memory",
    surrealUrl: process.env.SURREAL_URL ?? null,
    writeApi: flags.boolean(FLAGS.WRITE_API, false),
    trustDomain: trustDomain(),
  };
}

/** Assemble desired + observed state by reconciling against the live fabric. */
export async function controlState(): Promise<ControlState> {
  const spec = desiredSpec();
  const health = await getFabric().health();
  const nodes = health.connectors.reduce((sum, c) => sum + (c.nodes ?? 0), 0);

  const map: Record<string, Condition> = { ok: "Ready", degraded: "Degraded", down: "Pending" };

  const resources: ManagedResource[] = [
    {
      kind: "Deployment",
      name: "agennext",
      condition: health.status === "ok" ? "Ready" : "Degraded",
      detail: `${spec.replicas} replica(s) · ${spec.image}`,
    },
    { kind: "Service", name: "agennext", condition: "Ready", detail: "port 80 → 3000" },
    ...health.connectors.map<ManagedResource>((c) => ({
      kind: "Connector",
      name: c.id,
      condition: map[c.status] ?? "Pending",
      detail: c.detail ?? undefined,
    })),
  ];

  if (spec.connector === "surreal" && !spec.surrealUrl) {
    resources.push({
      kind: "SurrealDB",
      name: "surreal",
      condition: "Pending",
      detail: "SURREAL_URL not set",
    });
  }

  const condition: Condition = resources.every((r) => r.condition === "Ready")
    ? "Ready"
    : resources.some((r) => r.condition === "Degraded")
      ? "Degraded"
      : "Pending";

  return { spec, status: { condition, nodes, resources } };
}
