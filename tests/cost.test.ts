import { describe, expect, it } from "vitest";
import { CLUSTERS, planMigration, resolveTargetDistro } from "@/lib/migration/migration";
import { estimateMigrationCost, RATE_CARDS } from "@/lib/migration/cost";

describe("migration cost estimation", () => {
  it("estimates source vs target monthly cost and the delta", () => {
    const est = estimateMigrationCost(CLUSTERS["k3s-edge"], "aws");
    expect(est.currency).toBe("USD");
    expect(est.targetMonthly).toBeGreaterThan(0);
    expect(est.deltaMonthly).toBe(est.targetMonthly - est.sourceMonthly);
    // 1 stateful workload with a PV -> 100 GB estimated.
    expect(est.storageGb).toBe(100);
  });

  it("shows OVH cheaper than AWS for the same cluster", () => {
    const aws = estimateMigrationCost(CLUSTERS["k3s-edge"], "aws");
    const ovh = estimateMigrationCost(CLUSTERS["k3s-edge"], "ovh");
    expect(ovh.targetMonthly).toBeLessThan(aws.targetMonthly);
    expect(RATE_CARDS.ovh.nodeMonthly).toBeLessThan(RATE_CARDS.aws.nodeMonthly);
  });

  it("attaches a cost estimate to provider-targeted plans", () => {
    const plan = planMigration(CLUSTERS["k3s-edge"], resolveTargetDistro("ovh"), "ovh");
    expect(plan.cost?.targetMonthly).toBeGreaterThan(0);
  });
});
