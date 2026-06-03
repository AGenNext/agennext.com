import { getFabric } from "@/lib/fabric";
import { controlState } from "@/lib/controlplane/platform";
import { flags, FLAGS } from "@/lib/flags";
import { span } from "@/lib/observability";

/**
 * Operations Agent.
 *
 * An agent that works over the platform's operational state — connector health,
 * the control-plane desired/observed view, and feature flags — and produces a
 * status verdict with concrete findings and recommendations. Deterministic
 * rule-based reasoning; no external calls.
 */

export const OPERATIONS_AGENT = {
  id: "operations-agent",
  name: "Operations Agent",
  description: "Audits connector health, control-plane state, and flags; recommends actions.",
} as const;

export type Severity = "ok" | "warn" | "critical";

export interface Finding {
  severity: Severity;
  title: string;
  detail: string;
  recommendation?: string;
}

export interface OpsReport {
  verdict: Severity;
  nodes: number;
  findings: Finding[];
}

export function operationsTraced(): Promise<OpsReport> {
  return span("agent.operations", runOperations, { agent: OPERATIONS_AGENT.id });
}

async function runOperations(): Promise<OpsReport> {
  const fabric = getFabric();
  const [health, control] = await Promise.all([fabric.health(), controlState()]);
  const findings: Finding[] = [];

  // Connector health.
  for (const c of health.connectors) {
    if (c.status !== "ok") {
      findings.push({
        severity: c.status === "down" ? "critical" : "warn",
        title: `Connector "${c.id}" is ${c.status}`,
        detail: c.detail ?? "no detail",
        recommendation: "Check the backing store and connection settings.",
      });
    }
  }

  // Durability posture.
  const connectorIds = health.connectors.map((c) => c.id);
  if (connectorIds.includes("memory") && !connectorIds.includes("surreal")) {
    findings.push({
      severity: "warn",
      title: "Ephemeral in-memory store in use",
      detail: "Data will not survive a restart.",
      recommendation: "Set DATA_DIR for the durable file store, or SURREAL_URL for SurrealDB.",
    });
  }

  // Control-plane reconciliation.
  for (const r of control.status.resources) {
    if (r.condition !== "Ready") {
      findings.push({
        severity: r.condition === "Degraded" ? "warn" : "warn",
        title: `${r.kind}/${r.name} is ${r.condition}`,
        detail: r.detail ?? "",
        recommendation: "Reconcile the control plane or check the resource.",
      });
    }
  }

  // Write path posture (informational).
  if (!flags.boolean(FLAGS.WRITE_API, false)) {
    findings.push({
      severity: "ok",
      title: "Write API disabled",
      detail: "The graph is read-only.",
      recommendation: "Enable the write-api flag to allow authorized writes.",
    });
  }

  const verdict: Severity = findings.some((f) => f.severity === "critical")
    ? "critical"
    : findings.some((f) => f.severity === "warn")
      ? "warn"
      : "ok";

  return { verdict, nodes: control.status.nodes, findings };
}
