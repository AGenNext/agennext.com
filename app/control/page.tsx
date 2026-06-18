import { controlState, type Condition } from "@/lib/controlplane/platform";

export const dynamic = "force-dynamic";

const TONE: Record<Condition, string> = {
  Ready: "text-ok",
  Degraded: "text-warn",
  Pending: "text-muted",
};

function Dot({ c }: { c: Condition }) {
  const bg = c === "Ready" ? "bg-ok" : c === "Degraded" ? "bg-warn" : "bg-muted";
  return <span className={`inline-block h-2 w-2 rounded-full ${bg}`} />;
}

export default async function ControlPanel() {
  const { spec, status } = await controlState();

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Control Panel</h1>
        <span className={`pill px-2 py-0.5 text-xs ${TONE[status.condition]}`}>
          <Dot c={status.condition} /> {status.condition}
        </span>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        AGenNext operated as a Crossplane control plane: one declarative API describes the desired
        platform, and a reconcile loop drives observed state toward it. This mirrors the{" "}
        <code className="font-mono">AgennextPlatform</code> composite resource in{" "}
        <code className="font-mono">deploy/crossplane/</code>.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Desired state · spec
          </h2>
          <pre className="card mt-3 overflow-auto p-4 font-mono text-xs leading-relaxed">
            {JSON.stringify(
              {
                apiVersion: "platform.agennext.com/v1alpha1",
                kind: "AgennextPlatform",
                spec,
              },
              null,
              2,
            )}
          </pre>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Observed state · status
          </h2>
          <div className="card mt-3 p-4">
            <div className="flex items-center justify-between text-sm">
              <span>Composite</span>
              <span className={TONE[status.condition]}>
                <Dot c={status.condition} /> {status.condition}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted">{status.nodes} nodes reconciled</div>
            <ul className="mt-4 space-y-2">
              {status.resources.map((r) => (
                <li key={`${r.kind}/${r.name}`} className="flex items-start justify-between text-sm">
                  <span>
                    <span className="font-mono text-xs text-muted">{r.kind}/</span>
                    {r.name}
                    {r.detail && <span className="block text-xs text-muted">{r.detail}</span>}
                  </span>
                  <span className={`whitespace-nowrap ${TONE[r.condition]}`}>
                    <Dot c={r.condition} /> {r.condition}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <a
            href="/api/control"
            className="mt-4 inline-block font-mono text-xs text-accent hover:underline"
          >
            GET /api/control →
          </a>
        </section>
      </div>
    </div>
  );
}
