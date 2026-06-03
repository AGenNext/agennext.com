import type { GraphNode, Edge } from "@/lib/protocol";
import { getString, getTypes, labelOf, slugOf } from "@/lib/protocol";
import { degrees, neighborhood, shortestPath, type Hop } from "@/lib/graph/algorithms";
import { INVERSE_LABEL } from "@/lib/schema/org";
import { span } from "@/lib/observability";

/**
 * Research Agent.
 *
 * An agent that works over the data fabric: given a subject node it explores
 * the surrounding graph (bounded neighborhood + most-connected hubs), explains
 * the route from the subject to a key hub, and produces a structured brief
 * plus a Markdown summary. Pure graph reasoning — deterministic and offline;
 * an LLM summarizer can be layered on later behind the same result shape.
 */

export interface RelatedEntity {
  id: string;
  slug: string | null;
  label: string;
  type: string;
  distance: number;
}

export interface ResearchBrief {
  subject: { id: string; label: string; type: string; description?: string };
  related: RelatedEntity[];
  hubs: { id: string; label: string; degree: number }[];
  routeToTopHub?: { target: string; hops: number; steps: { label: string; relation: string }[] };
  markdown: string;
}

interface Snapshot {
  nodes: GraphNode[];
  edges: Edge[];
}

export const RESEARCH_AGENT = {
  id: "research-agent",
  name: "Research Agent",
  description: "Explores the knowledge graph around a subject and writes a cited brief.",
} as const;

function relationLabel(hop: Hop): string {
  return hop.reversed ? INVERSE_LABEL[hop.property] ?? `${hop.property} of` : hop.property;
}

export function research(snapshot: Snapshot, subjectId: string, hops = 2): ResearchBrief {
  return runResearch(snapshot, subjectId, hops);
}

function runResearch(snapshot: Snapshot, subjectId: string, hops: number): ResearchBrief {
  const byId = new Map(snapshot.nodes.map((n) => [n["@id"], n]));
  const subject = byId.get(subjectId);
  if (!subject) throw new Error(`Unknown subject: ${subjectId}`);

  const dist = neighborhood(snapshot.edges, subjectId, hops);
  const related: RelatedEntity[] = [...dist.entries()]
    .map(([id, distance]) => {
      const n = byId.get(id);
      return n
        ? { id, slug: slugOf(id), label: labelOf(n), type: getTypes(n)[0], distance }
        : null;
    })
    .filter((x): x is RelatedEntity => x !== null)
    .sort((a, b) => a.distance - b.distance || a.label.localeCompare(b.label));

  const deg = degrees(snapshot.edges);
  const hubs = [...deg.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, degree]) => ({ id, label: byId.get(id) ? labelOf(byId.get(id)!) : id, degree }));

  let routeToTopHub: ResearchBrief["routeToTopHub"];
  const topHub = hubs.find((h) => h.id !== subjectId);
  if (topHub) {
    const path = shortestPath(snapshot.edges, subjectId, topHub.id);
    if (path) {
      routeToTopHub = {
        target: topHub.label,
        hops: path.length,
        steps: path.map((h) => ({
          label: byId.get(h.to) ? labelOf(byId.get(h.to)!) : h.to,
          relation: relationLabel(h),
        })),
      };
    }
  }

  const subjectLabel = labelOf(subject);
  const subjectType = getTypes(subject)[0];
  const description = getString(subject, "description");

  const lines: string[] = [
    `# Research brief: ${subjectLabel}`,
    "",
    `**Type:** ${subjectType}`,
    ...(description ? ["", description] : []),
    "",
    `## Connections (${related.length} within ${hops} hops)`,
    ...related.slice(0, 12).map((r) => `- **${r.label}** _(${r.type}, ${r.distance} hop${r.distance > 1 ? "s" : ""})_`),
  ];
  if (routeToTopHub) {
    lines.push(
      "",
      `## Route to the most-connected hub (${routeToTopHub.target})`,
      routeToTopHub.steps.length === 0
        ? "_The subject is itself the hub._"
        : `${subjectLabel} ${routeToTopHub.steps.map((s) => `—[${s.relation}]→ ${s.label}`).join(" ")}`,
    );
  }

  return {
    subject: { id: subjectId, label: subjectLabel, type: subjectType, description },
    related,
    hubs,
    routeToTopHub,
    markdown: lines.join("\n"),
  };
}

/** Convenience wrapper that traces the run. */
export function researchTraced(snapshot: Snapshot, subjectId: string, hops?: number) {
  return span("agent.research", () => research(snapshot, subjectId, hops), { subject: subjectId });
}
