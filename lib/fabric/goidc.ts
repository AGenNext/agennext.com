import { iri } from "@/lib/protocol";
import type { GraphNode } from "@/lib/protocol";

/**
 * GoIDC ecosystem, modeled as Schema.org nodes — an Organization and its suite
 * of ecosystem apps. Demonstrates the data fabric ingesting an external
 * ecosystem as Linked Data, browsable alongside AGenNext.
 */
const org = { "@id": iri("goidc-org") };

type AppTuple = [slug: string, name: string, category: string, description: string];

const APPS: AppTuple[] = [
  ["goidc-web-card", "Web Card", "Digital Identity", "A single smart card as your unified digital identity."],
  ["goidc-web-portal", "Web Portal", "Global Access", "Global access portal for the GoIDC ecosystem."],
  ["goidc-cardx-pro", "CardX Pro", "Pro Templates", "Professional card templates and branding."],
  ["goidc-ai-fund", "AI Fund", "Smart Funding", "AI-driven funding for businesses and creators."],
  ["goidc-ai-vest", "AI Vest", "Investment", "AI-assisted investment across the network."],
  ["goidc-digital-core", "Digital Core", "Infrastructure", "Core digital infrastructure for the ecosystem."],
  ["goidc-trade-cloud", "Trade Cloud", "Global Trading", "Cross-border global trading platform."],
  ["goidc-franchise-hub", "Franchise Hub", "Partnerships", "Franchise and partnership network."],
];

export const GOIDC: GraphNode[] = [
  {
    "@id": iri("goidc-org"),
    "@type": "Organization",
    name: "GoIDC Ecosystem",
    description:
      "Connecting people, businesses, and AI ecosystems through a single smart card. ~318,000 active members across India and beyond.",
    url: "https://www.goidc.com",
    knowsAbout: [{ "@id": iri("term-linked-data") }],
  },
  ...APPS.map<GraphNode>(([slug, name, category, description]) => ({
    "@id": iri(slug),
    "@type": "SoftwareApplication",
    name,
    applicationCategory: category,
    description,
    isPartOf: org,
    publisher: org,
  })),
];
