import { controlState } from "@/lib/controlplane/platform";
import { span } from "@/lib/observability";

/**
 * Kubernetes Agent.
 *
 * Reasons over the control-plane desired spec to describe the intended
 * Kubernetes topology and surface deployment-readiness notes (replicas vs.
 * single-writer store, probes, persistence). It reports the declarative intent
 * that Crossplane/Flux reconcile — no live cluster access required.
 */

export const K8S_AGENT = {
  id: "k8s-agent",
  name: "Kubernetes Agent",
  description: "Describes the intended k8s topology from the control-plane spec and flags risks.",
} as const;

export interface K8sReport {
  workload: string;
  image: string;
  replicas: number;
  connector: string;
  persistence: string;
  probes: { liveness: string; readiness: string };
  notes: { severity: "ok" | "warn"; text: string }[];
}

export function k8sTraced(): Promise<K8sReport> {
  return span("agent.k8s", runK8s, { agent: K8S_AGENT.id });
}

async function runK8s(): Promise<K8sReport> {
  const { spec } = await controlState();
  const notes: K8sReport["notes"] = [];

  if (spec.connector === "memory" && spec.replicas > 1) {
    notes.push({
      severity: "warn",
      text: `${spec.replicas} replicas with an in-memory store: each pod holds independent data.`,
    });
  }
  if (spec.connector === "surreal") {
    notes.push({ severity: "ok", text: "SurrealDB backend supports multi-replica / HA." });
  } else if (spec.replicas > 1) {
    notes.push({
      severity: "warn",
      text: "File store is single-writer (RWO PVC); keep replicas at 1 or switch to SurrealDB.",
    });
  } else {
    notes.push({ severity: "ok", text: "Single replica is consistent with the file store." });
  }

  return {
    workload: "Deployment/agennext",
    image: spec.image,
    replicas: spec.replicas,
    connector: spec.connector,
    persistence: spec.connector === "surreal" ? "external (SurrealDB)" : "PVC at /data",
    probes: { liveness: "/api/healthz", readiness: "/api/readyz" },
    notes,
  };
}
