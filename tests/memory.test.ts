import { describe, expect, it } from "vitest";
import { recordMigration, migrationHistory } from "@/lib/agents/memory";
import { planMigration, CLUSTERS } from "@/lib/migration/migration";

describe("migration memory", () => {
  it("records a run and reads it back with correct source/target", async () => {
    const plan = planMigration(CLUSTERS["talos-baremetal"], "eks");
    const id = await recordMigration(plan);
    expect(id).toContain("migration-talos-baremetal-eks");

    const history = await migrationHistory();
    const run = history.find((h) => h.id === id);
    expect(run).toBeDefined();
    expect(run!.source).toBe("talos-baremetal"); // hyphenated id preserved
    expect(run!.target).toBe("eks");
    expect(run!.steps).toBeGreaterThan(0);
  });
});
