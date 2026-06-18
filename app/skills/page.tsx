import Link from "next/link";
import { getFabric } from "@/lib/fabric";
import { getString, labelOf, slugOf } from "@/lib/protocol";
import { Badge, SectionLabel, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * Skill catalog: every Skill node, with the templates and agents that use it
 * (derived from hasPart / isBasedOn edges in the graph).
 */
export default async function SkillsPage() {
  const { nodes, edges } = await getFabric().snapshot();
  const byId = new Map(nodes.map((n) => [n["@id"], n]));
  const cat = (n: (typeof nodes)[number]) => getString(n, "applicationCategory");

  const skills = nodes.filter((n) => cat(n) === "Skill");

  // template --hasPart--> skill ; agent --isBasedOn--> template
  const templatesForSkill = new Map<string, string[]>();
  const agentsForTemplate = new Map<string, string[]>();
  for (const e of edges) {
    if (e.property === "hasPart" && cat(byId.get(e.from)!) === "AgentTemplate" && cat(byId.get(e.to)!) === "Skill") {
      (templatesForSkill.get(e.to) ?? templatesForSkill.set(e.to, []).get(e.to)!).push(e.from);
    }
    if (e.property === "isBasedOn" && byId.get(e.from) && cat(byId.get(e.from)!) === "Agent") {
      (agentsForTemplate.get(e.to) ?? agentsForTemplate.set(e.to, []).get(e.to)!).push(e.from);
    }
  }

  const usedBy = (skillId: string) => {
    const templates = templatesForSkill.get(skillId) ?? [];
    const agents = new Set<string>();
    for (const t of templates) for (const a of agentsForTemplate.get(t) ?? []) agents.add(a);
    return {
      templates: templates.map((id) => ({ id, label: labelOf(byId.get(id)!), slug: slugOf(id) })),
      agents: [...agents].map((id) => ({ id, label: labelOf(byId.get(id)!), slug: slugOf(id) })),
    };
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Skill catalog</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Composable capabilities agents draw on. Each skill shows the templates that include it and
        the agents that ultimately use it — all derived from the graph.
      </p>

      <div className="mt-6 grid max-w-xs grid-cols-2 gap-3">
        <Stat label="skills" value={skills.length} />
        <Stat label="templates" value={nodes.filter((n) => cat(n) === "AgentTemplate").length} />
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {skills.map((s) => {
          const { templates, agents } = usedBy(s["@id"]);
          const slug = slugOf(s["@id"]);
          return (
            <div key={s["@id"]} className="card p-4">
              <Badge>Skill</Badge>
              <Link href={slug ? `/thing/${slug}` : s["@id"]} className="mt-2 block font-medium hover:text-accent">
                {labelOf(s)}
              </Link>
              <p className="mt-1 text-xs text-muted">{getString(s, "description")}</p>
              {templates.length > 0 && (
                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted">Used in</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {templates.map((t) => (
                      <Link key={t.id} href={t.slug ? `/thing/${t.slug}` : t.id} className="pill px-2 py-0.5 text-[11px] text-muted hover:text-accent">
                        {t.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {agents.length > 0 && (
                <div className="mt-2">
                  <div className="text-[10px] uppercase tracking-wide text-muted">Agents</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {agents.map((a) => (
                      <Link key={a.id} href={a.slug ? `/thing/${a.slug}` : a.id} className="pill px-2 py-0.5 text-[11px] text-accent">
                        {a.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
