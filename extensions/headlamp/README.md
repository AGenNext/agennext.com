# AGenNext Headlamp Extension

A [Headlamp](https://headlamp.dev/) plugin that surfaces the AGenNext agent
platform inside the Kubernetes UI.

> Scaffold. The plugin registers a sidebar section and talks to the AGenNext
> API (`/api/agents/*`, `/api/graph`, `/api/control`). Build it out incrementally.

## Planned panels

| Panel | Backed by |
| --- | --- |
| **Chat with cluster** | Agent Runtime (`/api/agents/*`) |
| **Agent dashboard** | `GET /api/agents` (catalog) + runs |
| **Migration wizard** | Migration Agent (`POST /api/agents/migration`) |
| **Workflow visualization** | Graph + `/api/path` (routes) |
| **Memory explorer** | SurrealDB memory via `/api/graph` |

## Develop

```bash
cd extensions/headlamp
npm install
npm start          # headlamp-plugin start (hot-reload into a running Headlamp)
```

Set `AGENNEXT_API` to point the plugin at your platform deployment
(defaults to `http://localhost:3000`).
