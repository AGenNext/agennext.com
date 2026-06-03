"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export interface GraphNodeLite {
  id: string;
  slug: string | null;
  label: string;
  type: string;
}
export interface GraphEdgeLite {
  from: string;
  to: string;
  property: string;
}

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const W = 720;
const H = 460;

/** A small dependency-free force-directed graph rendered as SVG. */
export function GraphView({ nodes, edges }: { nodes: GraphNodeLite[]; edges: GraphEdgeLite[] }) {
  const router = useRouter();
  const [, force] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const drag = useRef<string | null>(null);
  const pos = useRef(new Map<string, P>());
  const frame = useRef(0);

  // Deterministic-ish initial layout on a circle.
  useMemo(() => {
    pos.current = new Map();
    nodes.forEach((n, i) => {
      const a = (i / Math.max(1, nodes.length)) * Math.PI * 2;
      pos.current.set(n.id, { x: W / 2 + Math.cos(a) * 160, y: H / 2 + Math.sin(a) * 140, vx: 0, vy: 0 });
    });
  }, [nodes]);

  useEffect(() => {
    const adj = edges.filter((e) => pos.current.has(e.from) && pos.current.has(e.to));
    let ticks = 0;
    const step = () => {
      const p = pos.current;
      // Repulsion (O(n^2); fine for this scale).
      const arr = [...p.entries()];
      for (let i = 0; i < arr.length; i++) {
        const a = arr[i][1];
        for (let j = i + 1; j < arr.length; j++) {
          const b = arr[j][1];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let d2 = dx * dx + dy * dy || 0.01;
          const f = 1800 / d2;
          const d = Math.sqrt(d2);
          dx /= d;
          dy /= d;
          a.vx += dx * f;
          a.vy += dy * f;
          b.vx -= dx * f;
          b.vy -= dy * f;
        }
      }
      // Springs along edges.
      for (const e of adj) {
        const a = p.get(e.from)!;
        const b = p.get(e.to)!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const f = (d - 90) * 0.01;
        a.vx += (dx / d) * f;
        a.vy += (dy / d) * f;
        b.vx -= (dx / d) * f;
        b.vy -= (dy / d) * f;
      }
      // Integrate + gentle centering + damping.
      for (const [id, n] of p) {
        if (drag.current === id) {
          n.vx = 0;
          n.vy = 0;
          continue;
        }
        n.vx = (n.vx + (W / 2 - n.x) * 0.002) * 0.85;
        n.vy = (n.vy + (H / 2 - n.y) * 0.002) * 0.85;
        n.x = Math.max(20, Math.min(W - 20, n.x + n.vx));
        n.y = Math.max(20, Math.min(H - 20, n.y + n.vy));
      }
      force((v) => v + 1);
      ticks++;
      if (ticks < 600 || drag.current) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [nodes, edges]);

  function onMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const n = pos.current.get(drag.current);
    if (n) {
      n.x = ((e.clientX - rect.left) / rect.width) * W;
      n.y = ((e.clientY - rect.top) / rect.height) * H;
    }
  }

  const neighbors = useMemo(() => {
    const m = new Set<string>();
    if (hover) for (const e of edges) {
      if (e.from === hover) m.add(e.to);
      if (e.to === hover) m.add(e.from);
    }
    return m;
  }, [hover, edges]);

  const p = pos.current;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="card h-[460px] w-full touch-none select-none"
      onPointerMove={onMove}
      onPointerUp={() => (drag.current = null)}
      onPointerLeave={() => (drag.current = null)}
    >
      {edges.map((e, i) => {
        const a = p.get(e.from);
        const b = p.get(e.to);
        if (!a || !b) return null;
        const lit = hover && (e.from === hover || e.to === hover);
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={lit ? "var(--color-accent)" : "var(--color-border)"}
            strokeWidth={lit ? 1.5 : 1}
          />
        );
      })}
      {nodes.map((n) => {
        const c = p.get(n.id);
        if (!c) return null;
        const dim = hover && hover !== n.id && !neighbors.has(n.id);
        return (
          <g
            key={n.id}
            transform={`translate(${c.x},${c.y})`}
            className="cursor-pointer"
            opacity={dim ? 0.35 : 1}
            onPointerDown={() => (drag.current = n.id)}
            onPointerEnter={() => setHover(n.id)}
            onPointerLeave={() => setHover(null)}
            onClick={() => n.slug && router.push(`/thing/${n.slug}`)}
          >
            <circle r={hover === n.id ? 7 : 5} fill="var(--color-accent)" />
            <text x={9} y={4} fontSize={10} fill="var(--color-foreground)">
              {n.label.length > 22 ? n.label.slice(0, 21) + "…" : n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
