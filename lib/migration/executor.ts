import type { MigrationPlan, MigrationStep } from "@/lib/migration/migration";

/**
 * Migration execution layer.
 *
 * Turns a migration plan into concrete cluster operations and runs them through
 * a pluggable executor. The default {@link DryRunExecutor} simulates — it
 * records what *would* run without touching a cluster — which is the safe
 * default. A live executor (shelling out to kubectl / helm / talosctl, or the
 * Kubernetes MCP tools) implements the same interface and is the seam where
 * real execution plugs in.
 */

export type Op =
  | "backup"
  | "provision"
  | "apply"
  | "helm-install"
  | "talosctl-apply"
  | "remap-endpoint"
  | "validate";

export interface ExecAction {
  op: Op;
  target: string;
  detail: string;
}

export type ExecStatus = "applied" | "dry-run" | "skipped" | "failed";

export interface ExecResult {
  action: ExecAction;
  status: ExecStatus;
  message?: string;
}

export interface KubeExecutor {
  readonly mode: "dry-run" | "live";
  run(action: ExecAction): Promise<ExecResult>;
}

/** Safe default: records intended actions, runs nothing. */
export class DryRunExecutor implements KubeExecutor {
  readonly mode = "dry-run" as const;
  async run(action: ExecAction): Promise<ExecResult> {
    return { action, status: "dry-run", message: `would ${action.op}` };
  }
}

function opFor(step: MigrationStep): Op {
  const t = step.title.toLowerCase();
  if (t.includes("provision")) return "provision";
  if (t.includes("talos machineconfig")) return "talosctl-apply";
  if (t.includes("helm")) return "helm-install";
  if (t.includes("re-point")) return "remap-endpoint";
  if (t.includes("back up") || t.includes("snapshot")) return "backup";
  if (step.phase === "validate") return "validate";
  return "apply";
}

/** Concrete operations derived from a plan's plan/migrate/validate steps. */
export function planToActions(plan: MigrationPlan): ExecAction[] {
  return plan.steps
    .filter((s) => s.phase === "plan" || s.phase === "migrate" || s.phase === "validate")
    .map((s) => ({ op: opFor(s), target: s.title, detail: s.detail }));
}

export interface ExecutionLog {
  mode: KubeExecutor["mode"];
  total: number;
  results: ExecResult[];
  summary: string;
}

/** Execute a plan through an executor (dry-run by default). */
export async function executePlan(
  plan: MigrationPlan,
  executor: KubeExecutor = new DryRunExecutor(),
): Promise<ExecutionLog> {
  const actions = planToActions(plan);
  const results: ExecResult[] = [];
  for (const action of actions) results.push(await executor.run(action));
  const failed = results.filter((r) => r.status === "failed").length;
  return {
    mode: executor.mode,
    total: results.length,
    results,
    summary: `${results.length} actions (${executor.mode})${failed ? `, ${failed} failed` : ""}`,
  };
}
