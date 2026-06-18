"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Explore" },
  { href: "/agents", label: "Agents" },
  { href: "/constitution", label: "Constitution" },
  { href: "/catalog", label: "Catalog" },
  { href: "/skills", label: "Skills" },
  { href: "/stack", label: "Registry" },
  { href: "/repos", label: "Repos" },
  { href: "/schema", label: "Schema" },
  { href: "/control", label: "Control" },
  { href: "/admin", label: "Admin" },
  { href: "/console", label: "Console" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3.5">
      <Link href="/" className="shrink-0 text-[15px] font-semibold tracking-tight">
        <span className="text-accent">AGen</span>Next
      </Link>
      <div className="no-scrollbar flex items-center gap-0.5 overflow-x-auto">
        {LINKS.map((l) => {
          const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition ${
                active
                  ? "bg-surface-2 text-foreground"
                  : "text-muted hover:bg-surface-2/60 hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
        <a
          href="/api/graph"
          className="whitespace-nowrap rounded-md px-3 py-1.5 font-mono text-sm text-muted hover:text-foreground"
        >
          API
        </a>
      </div>
    </nav>
  );
}
