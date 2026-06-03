import Link from "next/link";
import { getFabric } from "@/lib/fabric";
import { getString, slugOf, type GraphNode } from "@/lib/protocol";

export const dynamic = "force-dynamic";

/**
 * Landscape view (CNCF landscapeapp-inspired) of the projects AGenNext is
 * built on. The open foundation is everything the platform declares via
 * `isBasedOn`; commercial products are listed separately as tools only and
 * are never part of the platform's dependency foundation.
 */

const COMMERCIAL_TOOLS = new Set(["tech-ai-platform"]);

function Card({ node }: { node: GraphNode }) {
  const slug = slugOf(node["@id"]);
  return (
    <Link
      href={slug ? `/thing/${slug}` : node["@id"]}
      className="card p-4 transition hover:border-accent"
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">{getString(node, "name")}</span>
        <span className="pill px-2 py-0.5 text-[11px] text-muted">
          {getString(node, "applicationCategory")}
        </span>
      </div>
      <p className="mt-2 text-xs text-muted">{getString(node, "description")}</p>
    </Link>
  );
}

export default async function StackPage() {
  const apps = (await getFabric().query({ type: "SoftwareApplication" })).items;
  const stack = apps.filter((n) => slugOf(n["@id"])?.startsWith("tech-"));

  const foundation = stack.filter((n) => !COMMERCIAL_TOOLS.has(slugOf(n["@id"]) ?? ""));
  const tools = stack.filter((n) => COMMERCIAL_TOOLS.has(slugOf(n["@id"]) ?? ""));

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Stack</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        The open, cloud-native foundation AGenNext is built on — and the commercial tools it can
        integrate with. The platform documents its own foundations as nodes in its graph.
      </p>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-muted">
        Open foundation
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {foundation.map((n) => (
          <Card key={n["@id"]} node={n} />
        ))}
      </div>

      {tools.length > 0 && (
        <>
          <h2 className="mt-12 text-sm font-semibold uppercase tracking-wide text-muted">
            Commercial tools
          </h2>
          <p className="mt-1 text-xs text-muted">
            Integrated as optional tools only — never part of the dependency foundation.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((n) => (
              <Card key={n["@id"]} node={n} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
