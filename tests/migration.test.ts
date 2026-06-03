import { describe, expect, it } from "vitest";
import { CLUSTERS, planMigration } from "@/lib/migration/migration";

describe("migration planner", () => {
  it("plans k3s -> eks with storage, ingress, and LB steps", () => {
    const plan = planMigration(CLUSTERS["k3s-edge"], "eks");
    const titles = plan.steps.map((s) => s.title);
    expect(titles).toContain("Remap StorageClass");
    expect(titles).toContain("Swap ingress controller");
    expect(titles).toContain("Provision cloud load balancers");
    expect(plan.steps.some((s) => s.phase === "validate")).toBe(true);
    expect(plan.rollbackPlan.length).toBeGreaterThan(0);
  });

  it("flags high risk for stateful workloads with persistent volumes", () => {
    const plan = planMigration(CLUSTERS["k3s-edge"], "gke");
    const storage = plan.steps.find((s) => s.title === "Remap StorageClass");
    expect(storage?.risk).toBe("high");
    expect(plan.risks.join(" ")).toMatch(/persistent volumes/i);
  });

  it("produces fewer steps for a like-for-like move", () => {
    const plan = planMigration(CLUSTERS["microk8s-dev"], "microk8s");
    // No storage/ingress swap needed when distro is unchanged.
    expect(plan.steps.find((s) => s.title === "Remap StorageClass")).toBeUndefined();
    expect(plan.steps.find((s) => s.title === "Swap ingress controller")).toBeUndefined();
  });
});
