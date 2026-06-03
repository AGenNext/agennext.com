import type { Metadata } from "next";
import { AdminPanel } from "@/components/admin/AdminPanel";

export const metadata: Metadata = { title: "Admin · AGenNext" };
export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Operate the platform: inspect connectors and traces, author nodes, and extract entities
        from text. Writes require an authorized SPIFFE identity and the <code>write-api</code> flag.
      </p>
      <div className="mt-8">
        <AdminPanel />
      </div>
    </div>
  );
}
