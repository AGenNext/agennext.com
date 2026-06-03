/**
 * Kubernetes migration model + planner.
 *
 * The Migration Agent reasons over cluster inventories to produce a migration
 * plan between distributions (k3s ↔ MicroK8s, and to EKS/GKE/AKS): discovery,
 * planning (with risk analysis), validation, and rollback. Deterministic and
 * rule-based; inventories are sample data here and would come from the
 * Kubernetes MCP server in a live deployment.
 */

export type Distro = "k3s" | "microk8s" | "talos" | "eks" | "gke" | "aks" | "ovh";

export const MANAGED: Distro[] = ["eks", "gke", "aks", "ovh"];

export interface Workload {
  name: string;
  namespace: string;
  kind: "Deployment" | "StatefulSet" | "DaemonSet";
  replicas: number;
  hasPersistentVolume?: boolean;
}

export interface HelmRelease {
  name: string;
  chart: string;
}

export interface ClusterInventory {
  id: string;
  name: string;
  distro: Distro;
  k8sVersion: string;
  nodes: number;
  namespaces: string[];
  workloads: Workload[];
  helm: HelmRelease[];
  storageClass: string;
  ingressController: string;
  loadBalancer: "servicelb" | "metallb" | "cloud";
}

/** Sample inventories (the MCP `kubernetes` tool would supply these live). */
export const CLUSTERS: Record<string, ClusterInventory> = {
  "k3s-edge": {
    id: "k3s-edge",
    name: "k3s-edge",
    distro: "k3s",
    k8sVersion: "1.29.4",
    nodes: 3,
    namespaces: ["default", "ingress", "monitoring"],
    workloads: [
      { name: "api", namespace: "default", kind: "Deployment", replicas: 2 },
      { name: "postgres", namespace: "default", kind: "StatefulSet", replicas: 1, hasPersistentVolume: true },
      { name: "node-exporter", namespace: "monitoring", kind: "DaemonSet", replicas: 3 },
    ],
    helm: [{ name: "traefik", chart: "traefik" }, { name: "prometheus", chart: "kube-prometheus-stack" }],
    storageClass: "local-path",
    ingressController: "traefik",
    loadBalancer: "servicelb",
  },
  "microk8s-dev": {
    id: "microk8s-dev",
    name: "microk8s-dev",
    distro: "microk8s",
    k8sVersion: "1.30.1",
    nodes: 1,
    namespaces: ["default"],
    workloads: [{ name: "web", namespace: "default", kind: "Deployment", replicas: 1 }],
    helm: [{ name: "nginx", chart: "ingress-nginx" }],
    storageClass: "microk8s-hostpath",
    ingressController: "nginx",
    loadBalancer: "metallb",
  },
  "talos-baremetal": {
    id: "talos-baremetal",
    name: "talos-baremetal",
    distro: "talos",
    k8sVersion: "1.30.3",
    nodes: 5,
    namespaces: ["default", "ingress-nginx", "monitoring"],
    workloads: [
      { name: "api", namespace: "default", kind: "Deployment", replicas: 3 },
      { name: "minio", namespace: "default", kind: "StatefulSet", replicas: 4, hasPersistentVolume: true },
    ],
    helm: [{ name: "ingress-nginx", chart: "ingress-nginx" }, { name: "metallb", chart: "metallb" }],
    storageClass: "local-path",
    ingressController: "nginx",
    loadBalancer: "metallb",
  },
};

/**
 * A target provider (the Unboxd "migrate by changing an endpoint" model):
 * migrations target a provider, not just a distro. Managed providers pin the
 * distro (aws→eks, gcp→gke, azure→aks); self-managed providers run k3s/Talos.
 */
export type Provider = "aws" | "gcp" | "azure" | "ovh" | "cloudstack" | "edge" | "onprem";

export interface ProviderInfo {
  id: Provider;
  name: string;
  managed: boolean;
  distro: Distro;
  loadBalancer: string;
  objectStore: string;
  identity: string;
}

export const PROVIDERS: Record<Provider, ProviderInfo> = {
  aws: { id: "aws", name: "AWS", managed: true, distro: "eks", loadBalancer: "Network Load Balancer", objectStore: "s3.<region>.amazonaws.com", identity: "IAM / IRSA" },
  gcp: { id: "gcp", name: "Google Cloud", managed: true, distro: "gke", loadBalancer: "Cloud Load Balancing", objectStore: "storage.googleapis.com", identity: "Workload Identity" },
  azure: { id: "azure", name: "Azure", managed: true, distro: "aks", loadBalancer: "Azure Load Balancer", objectStore: "blob.core.windows.net", identity: "Entra Workload ID" },
  ovh: { id: "ovh", name: "OVHcloud", managed: true, distro: "ovh", loadBalancer: "OVH Load Balancer", objectStore: "s3.<region>.io.cloud.ovh.net (S3-compatible)", identity: "OVH IAM / SPIFFE" },
  cloudstack: { id: "cloudstack", name: "CloudStack", managed: false, distro: "k3s", loadBalancer: "CloudStack LB", objectStore: "S3-compatible (MinIO)", identity: "SPIFFE" },
  edge: { id: "edge", name: "Edge", managed: false, distro: "talos", loadBalancer: "MetalLB", objectStore: "S3-compatible (MinIO)", identity: "SPIFFE" },
  onprem: { id: "onprem", name: "On-prem", managed: false, distro: "talos", loadBalancer: "MetalLB", objectStore: "S3-compatible (Ceph/MinIO)", identity: "SPIFFE" },
};

/** Resolve the effective target distro for a provider (+ optional override). */
export function resolveTargetDistro(provider: Provider, distro?: Distro): Distro {
  const info = PROVIDERS[provider];
  return info.managed ? info.distro : distro ?? info.distro;
}

export type Phase = "discovery" | "plan" | "migrate" | "validate" | "rollback";
export type Risk = "low" | "medium" | "high";

export interface MigrationStep {
  phase: Phase;
  order: number;
  title: string;
  detail: string;
  risk?: Risk;
}

export interface MigrationPlan {
  source: { id: string; distro: Distro; k8sVersion: string };
  target: Distro;
  targetProvider?: Provider;
  summary: string;
  steps: MigrationStep[];
  risks: string[];
  rollbackPlan: string[];
}

const STORAGE_CLASS: Record<Distro, string> = {
  k3s: "local-path",
  microk8s: "microk8s-hostpath",
  talos: "local-path",
  eks: "gp3",
  gke: "standard-rwo",
  aks: "managed-csi",
  ovh: "csi-cinder-high-speed",
};

const INGRESS: Record<Distro, string> = {
  k3s: "traefik",
  microk8s: "nginx",
  talos: "nginx",
  eks: "aws-load-balancer-controller",
  gke: "gce",
  aks: "application-gateway",
  ovh: "nginx",
};

export function planMigration(source: ClusterInventory, target: Distro, provider?: Provider): MigrationPlan {
  const steps: MigrationStep[] = [];
  const risks: string[] = [];
  let order = 1;
  const add = (phase: Phase, title: string, detail: string, risk?: Risk) =>
    steps.push({ phase, order: order++, title, detail, risk });
  const info = provider ? PROVIDERS[provider] : undefined;

  // Discovery
  add("discovery", "Inventory source cluster", `${source.workloads.length} workloads, ${source.helm.length} Helm releases across ${source.namespaces.length} namespaces.`);

  // Plan
  add("plan", "Snapshot & back up state", "Export all manifests and Helm values; back up PV data before any change.", "low");

  if (STORAGE_CLASS[source.distro] !== STORAGE_CLASS[target]) {
    const stateful = source.workloads.filter((w) => w.hasPersistentVolume);
    const risk: Risk = stateful.length ? "high" : "medium";
    add("plan", "Remap StorageClass", `${source.storageClass} → ${STORAGE_CLASS[target]}. Re-provision and migrate volume data for ${stateful.length} stateful workload(s).`, risk);
    if (stateful.length) risks.push(`${stateful.length} workload(s) use persistent volumes (RWO) — data migration required, downtime likely.`);
  }

  if (INGRESS[source.distro] !== INGRESS[target]) {
    add("plan", "Swap ingress controller", `${source.ingressController} → ${INGRESS[target]}. Rewrite Ingress annotations and IngressClass.`, "medium");
    risks.push("Ingress controller change requires annotation rewrites and a DNS cutover.");
  }

  if (source.loadBalancer !== "cloud" && MANAGED.includes(target)) {
    add("plan", "Provision cloud load balancers", `Replace ${source.loadBalancer} with the cloud provider load balancer for Service type=LoadBalancer.`, "medium");
  }

  if (target === "talos" || source.distro === "talos") {
    add(
      "plan",
      "Apply Talos MachineConfig",
      "Talos is immutable and API-driven — no SSH or node shell. Provision/manage nodes via talosctl and declarative MachineConfig instead of in-place changes.",
      "medium",
    );
    if (source.distro !== "talos" && target === "talos") {
      risks.push("Target is Talos: no SSH/node access — all node config must go through talosctl/MachineConfig.");
    }
  }

  if (info) {
    if (info.managed) {
      add("migrate", `Provision managed cluster on ${info.name}`, `Create a ${info.distro} cluster on ${info.name} and join nodes.`, "low");
    }
    // The Unboxd principle: migrate by changing the endpoint, not the code.
    add("migrate", "Re-point service endpoints", `Update object-storage / service endpoints to ${info.objectStore} (S3-compatible). Application code stays unchanged — only the endpoint moves.`, "medium");
    add("migrate", "Map workload identity", `Bind workloads to ${info.identity} on ${info.name}.`, "medium");
  }

  if (source.helm.length) {
    add("migrate", "Re-deploy Helm releases", `Reinstall ${source.helm.map((h) => h.name).join(", ")} with target-specific values.`, "low");
  }
  add("migrate", "Apply workloads", `Recreate ${source.workloads.length} workloads on the target and scale up.`, "low");

  // Validate
  add("validate", "Verify API compatibility", `Source k8s ${source.k8sVersion}; check removed/deprecated APIs against the target version.`, "low");
  add("validate", "Smoke-test workloads", "Confirm pods Ready, ingress reachable, and persistent data intact.", "low");

  const rollbackPlan = [
    "Keep the source cluster running until validation passes.",
    "Restore PV data from the pre-migration backup if validation fails.",
    "Revert DNS to the source ingress endpoint.",
    "Re-point GitOps (Flux) to the source cluster manifests.",
  ];

  const dest = info ? `${info.name} (${target})` : target;
  return {
    source: { id: source.id, distro: source.distro, k8sVersion: source.k8sVersion },
    target,
    targetProvider: provider,
    summary: `Migrate ${source.name} (${source.distro}) → ${dest}: ${steps.length} steps, ${risks.length} risk(s).`,
    steps,
    risks,
    rollbackPlan,
  };
}
