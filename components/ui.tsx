import Link from "next/link";
import type { ReactNode } from "react";

type Tone = "ok" | "warn" | "danger" | "muted" | "accent";

const DOT: Record<Tone, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  danger: "bg-danger",
  muted: "bg-muted",
  accent: "bg-accent",
};
const TEXT: Record<Tone, string> = {
  ok: "text-ok",
  warn: "text-warn",
  danger: "text-danger",
  muted: "text-muted",
  accent: "text-accent",
};

export function Badge({ children, tone = "accent" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`pill px-2 py-0.5 text-[11px] ${TEXT[tone]}`}>{children}</span>;
}

export function StatusDot({ tone }: { tone: Tone }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${DOT[tone]}`} />;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{children}</h2>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="card px-4 py-3">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
    </div>
  );
}

export function NodeCard({
  href,
  type,
  title,
  description,
}: {
  href: string;
  type: string;
  title: string;
  description?: string;
}) {
  return (
    <Link href={href} className="card group p-4 transition hover:border-accent">
      <Badge>{type}</Badge>
      <div className="mt-2 font-medium group-hover:text-accent">{title}</div>
      {description && <div className="mt-1 line-clamp-2 text-xs text-muted">{description}</div>}
    </Link>
  );
}
