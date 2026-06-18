import { describe, expect, it } from "vitest";
import { CLUSTERS, planMigration, resolveTargetDistro } from "@/lib/migration/migration";

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

  it("adds Talos MachineConfig handling and a no-SSH risk when targeting Talos", () => {
    const plan = planMigration(CLUSTERS["k3s-edge"], "talos");
    expect(plan.steps.some((s) => s.title === "Apply Talos MachineConfig")).toBe(true);
    expect(plan.risks.join(" ")).toMatch(/no SSH/i);
  });

  it("plans a Talos source migration", () => {
    const plan = planMigration(CLUSTERS["talos-baremetal"], "eks");
    expect(plan.source.distro).toBe("talos");
    expect(plan.steps.some((s) => s.phase === "validate")).toBe(true);
  });

  it("targets a provider: resolves the distro and adds endpoint/identity steps", () => {
    expect(resolveTargetDistro("aws")).toBe("eks");
    expect(resolveTargetDistro("edge")).toBe("talos");
    const plan = planMigration(CLUSTERS["k3s-edge"], resolveTargetDistro("aws"), "aws");
    expect(plan.targetProvider).toBe("aws");
    const titles = plan.steps.map((s) => s.title);
    expect(titles).toContain("Provision managed cluster on AWS");
    expect(titles).toContain("Re-point service endpoints");
    expect(titles).toContain("Map workload identity");
  });

  it("supports OVHcloud as a managed provider", () => {
    expect(resolveTargetDistro("ovh")).toBe("ovh");
    const plan = planMigration(CLUSTERS["k3s-edge"], resolveTargetDistro("ovh"), "ovh");
    expect(plan.targetProvider).toBe("ovh");
    expect(plan.steps.some((s) => s.title === "Provision managed cluster on OVHcloud")).toBe(true);
    expect(plan.steps.some((s) => s.title === "Re-point service endpoints")).toBe(true);
  });

  it("does not add a provision step for self-managed providers", () => {
    const plan = planMigration(CLUSTERS["k3s-edge"], resolveTargetDistro("onprem"), "onprem");
    expect(plan.steps.some((s) => s.title.startsWith("Provision managed cluster"))).toBe(false);
    expect(plan.steps.some((s) => s.title === "Re-point service endpoints")).toBe(true);
  });

  it("produces fewer steps for a like-for-like move", () => {
    const plan = planMigration(CLUSTERS["microk8s-dev"], "microk8s");
    // No storage/ingress swap needed when distro is unchanged.
    expect(plan.steps.find((s) => s.title === "Remap StorageClass")).toBeUndefined();
    expect(plan.steps.find((s) => s.title === "Swap ingress controller")).toBeUndefined();
  });
});
