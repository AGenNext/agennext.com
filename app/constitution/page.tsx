import type { Metadata } from "next";
import { CONSTITUTION } from "@/lib/agents/constitution";
import { SectionLabel } from "@/components/ui";

export const metadata: Metadata = { title: "Agent Constitution · AGenNext" };

/** The governing principles every agent on the platform must uphold. */
export default function ConstitutionPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <p className="pill inline-block px-3 py-1 text-xs text-muted">
        governance · v{CONSTITUTION.version}
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Agent Constitution</h1>
      <p className="mt-4 text-muted">{CONSTITUTION.preamble}</p>

      <div className="mt-10 space-y-4">
        <SectionLabel>Articles</SectionLabel>
        {CONSTITUTION.articles.map((a) => (
          <article key={a.id} className="card p-5">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-sm text-accent">{String(a.id).padStart(2, "0")}</span>
              <h2 className="font-medium">{a.title}</h2>
            </div>
            <p className="mt-2 text-sm">{a.principle}</p>
            <p className="mt-2 text-xs text-muted">
              <span className="uppercase tracking-wide">Enforced by</span> — {a.enforcement}
            </p>
          </article>
        ))}
      </div>

      <p className="mt-8 text-xs text-muted">
        Machine-readable at{" "}
        <a href="/api/constitution" className="font-mono text-accent hover:underline">
          GET /api/constitution
        </a>
        .
      </p>
    </div>
  );
}
