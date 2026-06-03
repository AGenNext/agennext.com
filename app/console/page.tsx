"use client";

import { useState } from "react";
import { usePolling } from "@/components/usePolling";

/**
 * Interactive query console for the data fabric.
 *
 * A terminal-style surface (Chaterm-inspired) that runs protocol queries
 * against /api/graph and shows a live observability panel (Dashbird-style)
 * fed by /api/readyz.
 */

interface Health {
  status: string;
  connectors: Array<{ id: string; status: string; nodes?: number; detail?: string }>;
}

export default function ConsolePage() {
  const [type, setType] = useState("");
  const [text, setText] = useState("");
  const [result, setResult] = useState<string>("// run a query");
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (text) params.set("text", text);
    const res = await fetch(`/api/graph?${params.toString()}`);
    const json = await res.json();
    setResult(JSON.stringify(json, null, 2));
    setLoading(false);
  }

  usePolling(() => {
    fetch("/api/readyz")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, 5000);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Console</h1>
      <p className="mt-2 text-sm text-muted">
        Run protocol queries against the fabric. Equivalent to{" "}
        <code className="font-mono">GET /api/graph</code>.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div>
          <div className="card flex flex-wrap items-end gap-3 p-4">
            <label className="text-xs text-muted">
              type
              <input
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="Organization"
                className="mt-1 block w-44 rounded-md border border-border bg-surface-2 px-2 py-1 font-mono text-sm"
              />
            </label>
            <label className="text-xs text-muted">
              text
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="agen"
                className="mt-1 block w-44 rounded-md border border-border bg-surface-2 px-2 py-1 font-mono text-sm"
              />
            </label>
            <button
              onClick={run}
              disabled={loading}
              className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-background disabled:opacity-50"
            >
              {loading ? "…" : "Run"}
            </button>
          </div>
          <pre className="card mt-4 max-h-[28rem] overflow-auto p-4 font-mono text-xs leading-relaxed">
            {result}
          </pre>
        </div>

        <aside>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Status</h2>
          <div className="card mt-3 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span>Fabric</span>
              <span className={health?.status === "ok" ? "text-ok" : "text-warn"}>
                {health?.status ?? "…"}
              </span>
            </div>
            <ul className="mt-3 space-y-2">
              {health?.connectors.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-xs">
                  <span className="font-mono">{c.id}</span>
                  <span className="text-muted">
                    {c.status}
                    {typeof c.nodes === "number" ? ` · ${c.nodes}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <a
            href="/api/metrics"
            className="mt-4 inline-block font-mono text-xs text-accent hover:underline"
          >
            /api/metrics →
          </a>
        </aside>
      </div>
    </div>
  );
}
