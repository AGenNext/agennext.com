import type { ClusterInventory, Distro, Provider } from "@/lib/migration/migration";

/**
 * OpenCost-style cost estimation.
 *
 * Rough monthly cost estimates from per-provider rate cards, so a migration
 * plan can show the FinOps impact (target cost vs. current, and the delta).
 * Figures are illustrative defaults; a real deployment would feed OpenCost /
 * provider pricing (e.g. OpenCost's OVH config) into these cards.
 */

export interface RateCard {
  /** USD per node per month (managed control plane + a typical worker). */
  nodeMonthly: number;
  /** USD per load balancer per month. */
  loadBalancerMonthly: number;
  /** USD per GB of persistent storage per month. */
  storageGbMonthly: number;
}

export const RATE_CARDS: Record<Provider, RateCard> = {
  aws: { nodeMonthly: 70, loadBalancerMonthly: 18, storageGbMonthly: 0.1 },
  gcp: { nodeMonthly: 65, loadBalancerMonthly: 18, storageGbMonthly: 0.1 },
  azure: { nodeMonthly: 68, loadBalancerMonthly: 20, storageGbMonthly: 0.12 },
  ovh: { nodeMonthly: 35, loadBalancerMonthly: 12, storageGbMonthly: 0.04 },
  cloudstack: { nodeMonthly: 25, loadBalancerMonthly: 6, storageGbMonthly: 0.03 },
  edge: { nodeMonthly: 8, loadBalancerMonthly: 0, storageGbMonthly: 0.02 },
  onprem: { nodeMonthly: 12, loadBalancerMonthly: 0, storageGbMonthly: 0.02 },
};

/** Self-managed distros run on owned/edge hardware for source-cost purposes. */
function sourceCard(distro: Distro): RateCard {
  if (distro === "eks") return RATE_CARDS.aws;
  if (distro === "gke") return RATE_CARDS.gcp;
  if (distro === "aks") return RATE_CARDS.azure;
  if (distro === "ovh") return RATE_CARDS.ovh;
  return RATE_CARDS.onprem; // k3s / microk8s / talos
}

/** Estimated persistent storage (GB): 100 GB per stateful workload with a PV. */
function storageGb(inventory: ClusterInventory): number {
  return inventory.workloads.filter((w) => w.hasPersistentVolume).length * 100;
}

function monthly(nodes: number, gb: number, card: RateCard): number {
  return Math.round(nodes * card.nodeMonthly + card.loadBalancerMonthly + gb * card.storageGbMonthly);
}

export interface CostEstimate {
  currency: "USD";
  sourceMonthly: number;
  targetMonthly: number;
  deltaMonthly: number;
  nodes: number;
  storageGb: number;
}

export function estimateMigrationCost(source: ClusterInventory, provider: Provider): CostEstimate {
  const gb = storageGb(source);
  const sourceMonthly = monthly(source.nodes, gb, sourceCard(source.distro));
  const targetMonthly = monthly(source.nodes, gb, RATE_CARDS[provider]);
  return {
    currency: "USD",
    sourceMonthly,
    targetMonthly,
    deltaMonthly: targetMonthly - sourceMonthly,
    nodes: source.nodes,
    storageGb: gb,
  };
}
