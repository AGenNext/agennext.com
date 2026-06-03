"use client";

import { useMemo, useState } from "react";
import { NodeCard } from "@/components/ui";

export interface BrowserItem {
  id: string;
  href: string;
  type: string;
  title: string;
  description?: string;
  /** Extra haystack text (e.g. category) for search. */
  keywords?: string;
}

/** Reusable search + @type facet browser used by Explore and the Registry. */
export function EntityBrowser({
  items,
  placeholder = "Search…",
  emptyLabel = "No matches.",
}: {
  items: BrowserItem[];
  placeholder?: string;
  emptyLabel?: string;
}) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<string | null>(null);

  const types = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of items) counts.set(it.type, (counts.get(it.type) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((it) => {
      if (type && it.type !== type) return false;
      if (!needle) return true;
      return `${it.title} ${it.description ?? ""} ${it.keywords ?? ""} ${it.type}`
        .toLowerCase()
        .includes(needle);
    });
  }, [items, q, type]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className="input sm:max-w-md"
          placeholder={placeholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        <div className="text-xs text-muted">
          {filtered.length} / {items.length}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          onClick={() => setType(null)}
          className={`pill px-2.5 py-1 text-xs ${type === null ? "text-accent" : "text-muted"}`}
        >
          all
        </button>
        {types.map(([t, n]) => (
          <button
            key={t}
            onClick={() => setType(type === t ? null : t)}
            className={`pill px-2.5 py-1 text-xs ${type === t ? "text-accent" : "text-muted"}`}
          >
            {t} <span className="opacity-60">{n}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 text-sm text-muted">{emptyLabel}</p>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((it) => (
            <NodeCard
              key={it.id}
              href={it.href}
              type={it.type}
              title={it.title}
              description={it.description}
            />
          ))}
        </div>
      )}
    </div>
  );
}
