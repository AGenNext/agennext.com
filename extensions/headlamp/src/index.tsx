/**
 * AGenNext Headlamp plugin (scaffold).
 *
 * Registers a sidebar section and a Migration Wizard route that calls the
 * AGenNext Migration Agent. Extend with the chat, dashboard, workflow, and
 * memory panels (see README). Kept dependency-light so it compiles once the
 * Headlamp plugin toolchain is installed.
 */
import {
  registerSidebarEntry,
  registerRoute,
} from "@kinvolk/headlamp-plugin/lib";

const API = (globalThis as { AGENNEXT_API?: string }).AGENNEXT_API ?? "http://localhost:3000";

registerSidebarEntry({
  parent: null,
  name: "agennext",
  label: "AGenNext",
  url: "/agennext/agents",
  icon: "mdi:robot",
});

registerSidebarEntry({
  parent: "agennext",
  name: "agennext-migration",
  label: "Migration Wizard",
  url: "/agennext/migration",
});

registerRoute({
  path: "/agennext/migration",
  sidebar: "agennext-migration",
  name: "AGenNext Migration",
  component: () => <MigrationWizard />,
});

/** Minimal wizard: pick source/target, call the Migration Agent, show the plan. */
function MigrationWizard() {
  // Real React/MUI wiring lands when the Headlamp toolchain is installed.
  return (
    <div style={{ padding: 16 }}>
      <h2>Migration Wizard</h2>
      <p>
        Plans Kubernetes migrations via the AGenNext Migration Agent at{" "}
        <code>{API}/api/agents/migration</code>.
      </p>
    </div>
  );
}
