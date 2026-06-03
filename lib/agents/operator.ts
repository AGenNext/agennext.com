import { operationsTraced, type Severity } from "@/lib/agents/operations";
import { k8sTraced } from "@/lib/agents/k8s";
import { span } from "@/lib/observability";

/**
 * Operator Agent.
 *
 * A control-loop agent (in the spirit of a Kubernetes operator) that
 * synthesizes the Operations and Kubernetes agents' signals into a single,
 * prioritized reconcile plan: what to change to move observed state toward the
 * desired state. Read-only — it proposes actions, it does not apply them.
 */

export const OPERATOR_AGENT = {
  id: "operator-agent",
  name: "Operator Agent",
  description: "Reconciles the platform: turns ops + k8s signals into a prioritized action plan.",
} as const;

export interface PlannedAction {
  priority: number;
  action: string;
  reason: string;
}

export interface OperatorPlan {
  verdict: Severity;
  actions: PlannedAction[];
}

export function operatorTraced(): Promise<OperatorPlan> {
  return span("agent.operator", runOperator, { agent: OPERATOR_AGENT.id });
}

async function runOperator(): Promise<OperatorPlan> {
  const [ops, k8s] = await Promise.all([operationsTraced(), k8sTraced()]);
  const actions: PlannedAction[] = [];

  for (const f of ops.findings) {
    if (!f.recommendation) continue;
    const priority = f.severity === "critical" ? 1 : f.severity === "warn" ? 2 : 3;
    actions.push({ priority, action: f.recommendation, reason: f.title });
  }
  for (const n of k8s.notes) {
    if (n.severity === "warn") {
      actions.push({ priority: 2, action: n.text, reason: "Kubernetes topology" });
    }
  }

  actions.sort((a, b) => a.priority - b.priority);
  return { verdict: ops.verdict, actions };
}
