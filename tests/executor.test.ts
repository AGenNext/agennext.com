import { describe, expect, it } from "vitest";
import { CLUSTERS, planMigration, resolveTargetDistro } from "@/lib/migration/migration";
import { DryRunExecutor, executePlan, planToActions } from "@/lib/migration/executor";

describe("migration executor", () => {
  const plan = planMigration(CLUSTERS["k3s-edge"], resolveTargetDistro("aws"), "aws");

  it("derives concrete ops from a plan", () => {
    const ops = planToActions(plan).map((a) => a.op);
    expect(ops).toContain("provision"); // managed target
    expect(ops).toContain("remap-endpoint"); // re-point endpoints
    expect(ops).toContain("helm-install");
    expect(ops).toContain("validate");
  });

  it("dry-runs every action without applying", async () => {
    const log = await executePlan(plan, new DryRunExecutor());
    expect(log.mode).toBe("dry-run");
    expect(log.total).toBeGreaterThan(0);
    expect(log.results.every((r) => r.status === "dry-run")).toBe(true);
  });

  it("maps a Talos target to a talosctl-apply op", () => {
    const talos = planMigration(CLUSTERS["k3s-edge"], resolveTargetDistro("edge"), "edge");
    expect(planToActions(talos).some((a) => a.op === "talosctl-apply")).toBe(true);
  });
});
