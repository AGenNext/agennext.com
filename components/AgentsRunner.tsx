"use client";

import { useState, type ReactNode } from "react";
import { SectionLabel, Badge, StatusDot } from "@/components/ui";

export interface NodeOption {
  slug: string;
  label: string;
  type: string;
}

interface Brief {
  subject: { label: string; type: string; description?: string };
  related: { slug: string | null; label: string; type: string; distance: number }[];
  hubs: { label: string; degree: number }[];
  routeToTopHub?: { target: string; hops: number; steps: { label: string; relation: string }[] };
  markdown: string;
}

interface PathStep {
  to: string | null;
  label: string;
  relation: string;
}

export function AgentsRunner({ nodes }: { nodes: NodeOption[] }) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <ResearchPanel nodes={nodes} />
      <RoutePanel nodes={nodes} />
      <ReportPanel
        title="Operations Agent"
        endpoint="/api/agents/operations"
        render={(d) => <OpsReport report={d as OpsData} />}
      />
      <ReportPanel
        title="Kubernetes Agent"
        endpoint="/api/agents/k8s"
        render={(d) => (
          <pre className="card overflow-auto p-3 font-mono text-[11px] leading-relaxed">
            {JSON.stringify(d, null, 2)}
          </pre>
        )}
      />
      <ReportPanel
        title="Operator Agent"
        endpoint="/api/agents/operator"
        render={(d) => <OperatorPlan plan={d as PlanData} />}
      />
    </div>
  );
}

interface PlanData {
  verdict: string;
  actions: { priority: number; action: string; reason: string }[];
}

function OperatorPlan({ plan }: { plan: PlanData }) {
  return (
    <div className="space-y-2">
      <div className="text-sm">
        Verdict:{" "}
        <span className={plan.verdict === "ok" ? "text-ok" : plan.verdict === "warn" ? "text-warn" : "text-danger"}>
          {plan.verdict}
        </span>
      </div>
      {plan.actions.length === 0 ? (
        <p className="text-xs text-muted">No actions — platform reconciled.</p>
      ) : (
        <ol className="space-y-1.5">
          {plan.actions.map((a, i) => (
            <li key={i} className="rounded-md border border-border p-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="pill px-1.5 py-0.5 text-[10px] text-accent">P{a.priority}</span>
                <span className="font-medium">{a.action}</span>
              </div>
              <div className="mt-1 text-muted">{a.reason}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

interface OpsData {
  verdict: string;
  nodes: number;
  findings: { severity: string; title: string; detail: string; recommendation?: string }[];
}

function OpsReport({ report }: { report: OpsData }) {
  return (
    <div className="space-y-2">
      <div className="text-sm">
        Verdict:{" "}
        <span className={report.verdict === "ok" ? "text-ok" : report.verdict === "warn" ? "text-warn" : "text-danger"}>
          {report.verdict}
        </span>{" "}
        <span className="text-xs text-muted">· {report.nodes} nodes</span>
      </div>
      {report.findings.map((f, i) => (
        <div key={i} className="rounded-md border border-border p-2 text-xs">
          <div className="flex items-center gap-2">
            <StatusDot tone={f.severity === "ok" ? "ok" : f.severity === "warn" ? "warn" : "danger"} />
            <span className="font-medium">{f.title}</span>
          </div>
          <div className="mt-1 text-muted">{f.detail}</div>
          {f.recommendation && <div className="mt-1 text-accent">→ {f.recommendation}</div>}
        </div>
      ))}
    </div>
  );
}

function ReportPanel({
  title,
  endpoint,
  render,
}: {
  title: string;
  endpoint: string;
  render: (data: unknown) => ReactNode;
}) {
  const [data, setData] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setData(null);
    const res = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const json = await res.json();
    setData(json.data ?? json);
    setBusy(false);
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <SectionLabel>{title}</SectionLabel>
        <Badge tone="accent">Agent</Badge>
      </div>
      <div className="card mt-3 space-y-3 p-4">
        <button onClick={run} disabled={busy} className="btn btn-primary disabled:opacity-50">
          {busy ? "Running…" : "Run"}
        </button>
        {data != null && render(data)}
      </div>
    </div>
  );
}

function ResearchPanel({ nodes }: { nodes: NodeOption[] }) {
  const [subject, setSubject] = useState(nodes[0]?.slug ?? "");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setBrief(null);
    const res = await fetch("/api/agents/research", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: subject }),
    });
    const data = await res.json();
    setBrief(data.data ?? null);
    setBusy(false);
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <SectionLabel>Research Agent</SectionLabel>
        <Badge tone="accent">Agent</Badge>
      </div>
      <div className="card mt-3 space-y-3 p-4">
        <label className="block text-xs text-muted">
          subject
          <select className="input mt-1" value={subject} onChange={(e) => setSubject(e.target.value)}>
            {nodes.map((n) => (
              <option key={n.slug} value={n.slug}>
                {n.label} ({n.type})
              </option>
            ))}
          </select>
        </label>
        <button onClick={run} disabled={busy || !subject} className="btn btn-primary disabled:opacity-50">
          {busy ? "Researching…" : "Run research"}
        </button>

        {brief && (
          <div className="space-y-3">
            <pre className="card max-h-72 overflow-auto p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
              {brief.markdown}
            </pre>
            <div>
              <div className="text-xs text-muted">Most-connected hubs</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {brief.hubs.map((h) => (
                  <span key={h.label} className="pill px-2 py-0.5 text-[11px]">
                    {h.label} · {h.degree}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RoutePanel({ nodes }: { nodes: NodeOption[] }) {
  const [from, setFrom] = useState(nodes[0]?.slug ?? "");
  const [to, setTo] = useState(nodes[1]?.slug ?? "");
  const [steps, setSteps] = useState<PathStep[] | null>(null);
  const [msg, setMsg] = useState("");

  async function find() {
    setSteps(null);
    setMsg("");
    const res = await fetch(`/api/path?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    const data = await res.json();
    if (res.ok) setSteps(data.data.steps);
    else setMsg(data.error ?? `HTTP ${res.status}`);
  }

  return (
    <div>
      <SectionLabel>Route finder (shortest path)</SectionLabel>
      <div className="card mt-3 space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-muted">
            from
            <select className="input mt-1" value={from} onChange={(e) => setFrom(e.target.value)}>
              {nodes.map((n) => (
                <option key={n.slug} value={n.slug}>
                  {n.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-muted">
            to
            <select className="input mt-1" value={to} onChange={(e) => setTo(e.target.value)}>
              {nodes.map((n) => (
                <option key={n.slug} value={n.slug}>
                  {n.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button onClick={find} className="btn btn-primary">
          Find route
        </button>
        {msg && <p className="text-xs text-danger">{msg}</p>}
        {steps && (
          <div className="text-sm">
            {steps.length === 0 ? (
              <span className="text-muted">Same node.</span>
            ) : (
              <p className="leading-relaxed">
                {steps.map((s, i) => (
                  <span key={i}>
                    <span className="font-mono text-xs text-accent">—[{s.relation}]→ </span>
                    {s.label}{" "}
                  </span>
                ))}
              </p>
            )}
            <p className="mt-2 text-xs text-muted">{steps.length} hop(s)</p>
          </div>
        )}
      </div>
    </div>
  );
}
