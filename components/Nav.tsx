"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Explore" },
  { href: "/stack", label: "Registry" },
  { href: "/schema", label: "Schema" },
  { href: "/agents", label: "Agents" },
  { href: "/control", label: "Control" },
  { href: "/admin", label: "Admin" },
  { href: "/console", label: "Console" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="mx-auto flex max-w-6xl items-center gap-1 px-6 py-4">
      <Link href="/" className="mr-4 font-semibold tracking-tight">
        <span className="text-accent">AGen</span>Next
      </Link>
      <div className="flex-1" />
      {LINKS.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              active ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
      <a
        href="/api/graph"
        className="rounded-md px-3 py-1.5 font-mono text-sm text-muted hover:text-foreground"
      >
        API
      </a>
    </nav>
  );
}
