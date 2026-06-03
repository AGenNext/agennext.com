import { iri } from "@/lib/protocol";
import type { GraphNode } from "@/lib/protocol";

/**
 * AGenNext organization repositories, modeled as schema.org SoftwareSourceCode
 * nodes so the platform's own codebase is part of the knowledge graph. Snapshot
 * of the public repos (the org has ~177 total); resyncable from the GitHub API.
 */

type RepoTuple = [name: string, description: string, language: string];

const REPO_DATA: RepoTuple[] = [
  ["Agent-MCPs", "Registry of Model Context Protocol servers and integrations", "TypeScript"],
  ["Agent-Image", "Image generation and processing agent for visual workflows", "Python"],
  ["Code-Review", "AI coding agent for senior developers powered by Claude", "Python"],
  ["Agent-Bench", "Agent performance benchmarking platform", "Rust"],
  ["Agent-Book", "", "Python"],
  ["Agent-Form", "AGenNext agent frame automation workflow", ""],
  ["Agent-Blueprint", "Agent blueprints", "SurrealQL"],
  ["agent-lifecycle-management", "Agent identity lifecycle management", "Python"],
  ["Agent-Extensions", "Agent extensions", "JavaScript"],
  ["Agent-Health", "Agent health checks", ""],
  ["Agent-Intelligence", "Agent intelligence", ""],
  ["Agent-Security", "Agent security", "HTML"],
  ["Agent-Speech", "Speech for agents", ""],
  ["Agent-Distro", "Agent distribution", ""],
  ["Agent-Sign", "Vendor-neutral Sigstore/Cosign helper for signing OCI artifacts and runtimes", "Shell"],
  ["AgentQL", "The official structured query language of the AGenNext platform", "TypeScript"],
  ["Agent-Vocabulary", "Shared agent vocabulary", "Python"],
  ["Agent-UI", "Agent UI components", ""],
  ["Design-Agent", "Design agent", "Python"],
  ["Agent-Society", "Interest- and hobby-based groups for agents", ""],
  ["Agent-PPT", "Presentation generation for agents", ""],
  ["Agent-Constitution", "A constitution for secure, governable, self-improving autonomous agents", ""],
  ["AgentcServices", "Agent services", ""],
  ["Agent-FinOps", "Cost management for agents", ""],
  ["Code-Assist", "Coding assistant", ""],
  ["Agent-Courses", "Learning courses for agents", "SurrealQL"],
  ["Agent-IDE", "IDE for building agents", "TypeScript"],
  ["Agent-Site", "Public website for AGenNext", "TypeScript"],
  ["Agent-Platform", "Open-source cloud-native composable full-stack agent platform", "SurrealQL"],
  ["Agent-Publications", "A publishing platform for autonomous agents", ""],
  ["AGenNext-Helper", "AGenNext helper", "Python"],
  ["Agent-Crew", "Multi-agent crews", ""],
  ["Agent-Review", "Agent review", "SurrealQL"],
  ["Agent-Objective", "Agent objectives", ""],
  ["Agent-Tweets", "Social posting for agents", ""],
  ["Agent-SDK", "Build any kind of agent from the agent SDK", ""],
  ["Agent-Skills", "Reusable agent skills", "SurrealQL"],
  ["Agent-GPA", "A framework for evaluating agent goal-plan-action alignment", ""],
  ["Agent-Theories", "Agent theories", "Astro"],
  ["Agent-Business", "Agent business logic", ""],
  ["Agent-Cortex", "Cortex for AGenNext", ""],
  ["Agent-deploy", "Agent deployment", "Python"],
  ["Agent-Secrets", "Secrets management for agents", ""],
  ["Agent-Drive", "Cloud storage for agents", ""],
  ["Agent-Services", "Agent services", "Python"],
];

const slug = (name: string) => `repo-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

export const REPOS: GraphNode[] = REPO_DATA.map(([name, description, language]) => {
  const url = `https://github.com/AGenNext/${name}`;
  const node: GraphNode = {
    "@id": iri(slug(name)),
    "@type": "SoftwareSourceCode",
    applicationCategory: "Repository",
    name,
    codeRepository: url,
    url,
    sameAs: url,
    author: { "@id": iri("agennext") },
  };
  if (description) node.description = description;
  if (language) node.programmingLanguage = language;
  return node;
});
