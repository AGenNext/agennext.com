import type { Edge } from "@/lib/protocol";

/**
 * Graph-theory primitives over the knowledge graph: adjacency, shortest paths
 * ("route problems"), and bounded neighborhoods. Pure functions on an edge
 * list so they are trivially testable and reusable by agents and the UI.
 */

export interface Hop {
  from: string;
  to: string;
  property: string;
  /** Direction the edge was traversed relative to its definition. */
  reversed: boolean;
}

interface AdjEntry {
  to: string;
  property: string;
  reversed: boolean;
}

/** Build an undirected adjacency map (edges are followable both ways). */
export function buildAdjacency(edges: Edge[]): Map<string, AdjEntry[]> {
  const adj = new Map<string, AdjEntry[]>();
  const add = (from: string, e: AdjEntry) => {
    const list = adj.get(from);
    if (list) list.push(e);
    else adj.set(from, [e]);
  };
  for (const e of edges) {
    add(e.from, { to: e.to, property: e.property, reversed: false });
    add(e.to, { to: e.from, property: e.property, reversed: true });
  }
  return adj;
}

/**
 * Shortest path between two nodes (BFS over the undirected graph). Returns the
 * ordered hops, or null if the nodes are not connected.
 */
export function shortestPath(edges: Edge[], from: string, to: string): Hop[] | null {
  if (from === to) return [];
  const adj = buildAdjacency(edges);
  const prev = new Map<string, Hop>();
  const seen = new Set<string>([from]);
  const queue: string[] = [from];

  while (queue.length) {
    const cur = queue.shift()!;
    for (const e of adj.get(cur) ?? []) {
      if (seen.has(e.to)) continue;
      seen.add(e.to);
      prev.set(e.to, { from: cur, to: e.to, property: e.property, reversed: e.reversed });
      if (e.to === to) {
        const path: Hop[] = [];
        let step: Hop | undefined = prev.get(to);
        while (step) {
          path.unshift(step);
          step = prev.get(step.from);
        }
        return path;
      }
      queue.push(e.to);
    }
  }
  return null;
}

/** Nodes within `hops` of `start`, with the distance to each (BFS). */
export function neighborhood(
  edges: Edge[],
  start: string,
  hops: number,
): Map<string, number> {
  const adj = buildAdjacency(edges);
  const dist = new Map<string, number>([[start, 0]]);
  const queue: string[] = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    const d = dist.get(cur)!;
    if (d >= hops) continue;
    for (const e of adj.get(cur) ?? []) {
      if (!dist.has(e.to)) {
        dist.set(e.to, d + 1);
        queue.push(e.to);
      }
    }
  }
  dist.delete(start);
  return dist;
}

/** Degree (number of incident edges) of each node — a simple centrality. */
export function degrees(edges: Edge[]): Map<string, number> {
  const deg = new Map<string, number>();
  const bump = (id: string) => deg.set(id, (deg.get(id) ?? 0) + 1);
  for (const e of edges) {
    bump(e.from);
    bump(e.to);
  }
  return deg;
}
