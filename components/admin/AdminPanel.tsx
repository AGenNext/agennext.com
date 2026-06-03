"use client";

import { useCallback, useEffect, useState } from "react";
import { SectionLabel, StatusDot } from "@/components/ui";
import { usePolling } from "@/components/usePolling";

/**
 * Dev-convenience writer identity. In production the service mesh injects the
 * verified SPIFFE id after mTLS; here the admin UI asserts it explicitly.
 */
const WRITER_HEADERS = {
  "content-type": "application/json",
  "x-spiffe-id": "spiffe://agennext.com/api/fabric/writer",
};

type Tab = "overview" | "authoring" | "iam" | "traces";

export function AdminPanel() {
  const [tab, setTab] = useState<Tab>("overview");
  return (
    <div>
      <div className="flex gap-1 border-b border-border">
        {(["overview", "authoring", "iam", "traces"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm capitalize transition ${
              tab === t ? "border-accent text-foreground" : "border-transparent text-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "overview" && <Overview />}
        {tab === "authoring" && <Authoring />}
        {tab === "iam" && <Iam />}
        {tab === "traces" && <Traces />}
      </div>
    </div>
  );
}

/* ----------------------------- overview ----------------------------- */

interface Control {
  spec: Record<string, unknown>;
  status: {
    condition: string;
    nodes: number;
    resources: { kind: string; name: string; condition: string; detail?: string }[];
  };
}

function tone(c: string) {
  return c === "Ready" || c === "ok" ? "ok" : c === "Degraded" || c === "degraded" ? "warn" : "muted";
}

function Overview() {
  const [control, setControl] = useState<Control | null>(null);
  usePolling(() => {
    fetch("/api/control").then((r) => r.json()).then((d) => setControl(d.data)).catch(() => {});
  }, 5000);

  if (!control) return <p className="text-sm text-muted">Loading…</p>;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <SectionLabel>Managed resources</SectionLabel>
        <ul className="card mt-3 divide-y divide-border">
          {control.status.resources.map((r) => (
            <li key={`${r.kind}/${r.name}`} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span>
                <span className="font-mono text-xs text-muted">{r.kind}/</span>
                {r.name}
                {r.detail && <span className="block text-xs text-muted">{r.detail}</span>}
              </span>
              <span className="text-xs">
                <StatusDot tone={tone(r.condition) as "ok"} /> {r.condition}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <SectionLabel>Desired spec</SectionLabel>
        <pre className="card mt-3 overflow-auto p-4 font-mono text-xs leading-relaxed">
          {JSON.stringify(control.spec, null, 2)}
        </pre>
      </div>
    </div>
  );
}

/* ----------------------------- authoring ---------------------------- */

function Authoring() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <NodeEditor />
      <ExtractPanel />
    </div>
  );
}

function NodeEditor() {
  const [slug, setSlug] = useState("");
  const [type, setType] = useState("Thing");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [extra, setExtra] = useState("{}");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setMsg(null);
    let props: Record<string, unknown> = {};
    try {
      props = JSON.parse(extra || "{}");
    } catch {
      setMsg({ ok: false, text: "Extra properties must be valid JSON." });
      return;
    }
    const node = {
      "@id": `https://agennext.com/id/${slug || name.toLowerCase().replace(/\s+/g, "-")}`,
      "@type": type,
      name,
      ...(description ? { description } : {}),
      ...props,
    };
    const res = await fetch("/api/graph", {
      method: "POST",
      headers: WRITER_HEADERS,
      body: JSON.stringify({ node }),
    });
    const data = await res.json();
    setMsg(
      res.ok
        ? { ok: true, text: `Saved ${node["@id"]}` }
        : { ok: false, text: data.error ?? `HTTP ${res.status}` },
    );
  }

  return (
    <div>
      <SectionLabel>Create / edit node</SectionLabel>
      <div className="card mt-3 space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-muted">
            slug
            <input className="input mt-1 font-mono" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="acme" />
          </label>
          <label className="text-xs text-muted">
            @type
            <input className="input mt-1 font-mono" value={type} onChange={(e) => setType(e.target.value)} />
          </label>
        </div>
        <label className="block text-xs text-muted">
          name
          <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block text-xs text-muted">
          description
          <textarea className="input mt-1" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="block text-xs text-muted">
          extra properties (JSON)
          <textarea className="input mt-1 font-mono" rows={3} value={extra} onChange={(e) => setExtra(e.target.value)} />
        </label>
        <button onClick={save} disabled={!name} className="btn btn-primary disabled:opacity-50">
          Save node
        </button>
        {msg && (
          <p className={`text-xs ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</p>
        )}
      </div>
    </div>
  );
}

interface Candidate {
  "@id": string;
  "@type": string | string[];
  name?: string;
  [k: string]: unknown;
}

function ExtractPanel() {
  const [text, setText] = useState("");
  const [type, setType] = useState("Thing");
  const [items, setItems] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<Record<string, string>>({});

  async function run() {
    setBusy(true);
    setItems([]);
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, type }),
    });
    const data = await res.json();
    setItems(data.data?.items ?? []);
    setBusy(false);
  }

  async function save(node: Candidate) {
    const res = await fetch("/api/graph", {
      method: "POST",
      headers: WRITER_HEADERS,
      body: JSON.stringify({ node }),
    });
    const data = await res.json();
    setSaved((s) => ({ ...s, [node["@id"]]: res.ok ? "saved" : data.error ?? `HTTP ${res.status}` }));
  }

  return (
    <div>
      <SectionLabel>AI extract → graph</SectionLabel>
      <div className="card mt-3 space-y-3 p-4">
        <textarea
          className="input font-mono"
          rows={4}
          placeholder="Paste text to extract schema.org entities from…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <input className="input max-w-[10rem] font-mono" value={type} onChange={(e) => setType(e.target.value)} />
          <button onClick={run} disabled={!text || busy} className="btn btn-primary disabled:opacity-50">
            {busy ? "Extracting…" : "Extract"}
          </button>
        </div>
        {items.map((n) => (
          <div key={n["@id"]} className="rounded-md border border-border p-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium">{n.name}</span>
              <button onClick={() => save(n)} className="pill px-2 py-0.5 text-accent">
                save
              </button>
            </div>
            <div className="mt-1 font-mono text-[11px] text-muted">{n["@id"]}</div>
            {saved[n["@id"]] && (
              <div className={saved[n["@id"]] === "saved" ? "text-ok" : "text-danger"}>
                {saved[n["@id"]]}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- iam ------------------------------- */

interface IamModel {
  trustDomain: string;
  publicReads: boolean;
  permissions: Record<string, string[]>;
  writers: string[];
  agentIdentities: { id: string; name: string; spiffeId: string }[];
}

function Iam() {
  const [iam, setIam] = useState<IamModel | null>(null);
  useEffect(() => {
    fetch("/api/iam").then((r) => r.json()).then((d) => setIam(d.data)).catch(() => {});
  }, []);
  if (!iam) return <p className="text-sm text-muted">Loading…</p>;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <SectionLabel>Trust domain (SPIFFE)</SectionLabel>
          <p className="mt-2 font-mono text-sm">spiffe://{iam.trustDomain}</p>
          <p className="mt-1 text-xs text-muted">
            Public reads: {iam.publicReads ? "enabled" : "disabled"}
          </p>
        </div>
        <div>
          <SectionLabel>Permissions → relations (Permify)</SectionLabel>
          <ul className="card mt-2 divide-y divide-border text-sm">
            {Object.entries(iam.permissions).map(([perm, rels]) => (
              <li key={perm} className="flex justify-between px-3 py-2">
                <span className="font-mono text-xs">{perm}</span>
                <span className="text-muted">{rels.join(" · ")}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <SectionLabel>Writers</SectionLabel>
          <ul className="mt-2 space-y-1 font-mono text-xs text-muted">
            {iam.writers.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      </div>
      <div>
        <SectionLabel>Agent identities</SectionLabel>
        <ul className="card mt-2 divide-y divide-border text-sm">
          {iam.agentIdentities.map((a) => (
            <li key={a.id} className="px-3 py-2">
              <div className="font-medium">{a.name}</div>
              <div className="mt-0.5 font-mono text-[11px] text-muted">{a.spiffeId}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------ traces ------------------------------ */

interface Span {
  name: string;
  traceId: string;
  durationMs: number;
  status: string;
  startedAt: number;
  attributes: Record<string, string>;
}

function Traces() {
  const [spans, setSpans] = useState<Span[]>([]);
  const [live, setLive] = useState(true);
  const load = useCallback(() => {
    fetch("/api/traces").then((r) => r.json()).then((d) => setSpans(d.spans ?? [])).catch(() => {});
  }, []);
  usePolling(load, 3000, live);

  return (
    <div>
      <div className="flex items-center justify-between">
        <SectionLabel>Recent spans ({spans.length})</SectionLabel>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLive((v) => !v)}
            className={`pill px-2.5 py-1 text-xs ${live ? "text-ok" : "text-muted"}`}
          >
            <StatusDot tone={live ? "ok" : "muted"} /> {live ? "live" : "paused"}
          </button>
          <button onClick={load} className="btn btn-ghost py-1">
            Refresh
          </button>
        </div>
      </div>
      {spans.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          No spans yet — exercise the API (queries, writes) and refresh.
        </p>
      ) : (
        <div className="card mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted">
              <tr className="border-b border-border">
                <th className="px-3 py-2 font-medium">span</th>
                <th className="px-3 py-2 font-medium">status</th>
                <th className="px-3 py-2 font-medium">duration</th>
                <th className="px-3 py-2 font-medium">trace</th>
              </tr>
            </thead>
            <tbody>
              {spans.map((s, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="px-3 py-2 font-mono">{s.name}</td>
                  <td className="px-3 py-2">
                    <StatusDot tone={s.status === "error" ? "danger" : "ok"} /> {s.status}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{s.durationMs} ms</td>
                  <td className="px-3 py-2 font-mono text-muted">{s.traceId.slice(0, 12)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
