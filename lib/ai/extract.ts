import { iri, type GraphNode } from "@/lib/protocol";
import { flags } from "@/lib/flags";
import { log, span } from "@/lib/observability";

/**
 * AI-native ingestion: turn unstructured text into typed Schema.org nodes.
 *
 * The platform is AI-native but not AI-dependent. The default extractor is a
 * dependency-free heuristic so ingestion always works offline; an optional
 * Claude provider (foundation-first: open heuristic first, model as a tool) is
 * used only when the `ai-extraction` flag and an API key are both present.
 */

export interface Extractor {
  readonly id: string;
  extract(text: string, hintType?: string): Promise<GraphNode[]>;
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || `node-${Date.now()}`
  );
}

/** Offline default: first line becomes the name, the rest the description. */
export class HeuristicExtractor implements Extractor {
  readonly id = "heuristic";

  async extract(text: string, hintType = "Thing"): Promise<GraphNode[]> {
    const trimmed = text.trim();
    if (!trimmed) return [];
    const [first, ...rest] = trimmed.split("\n");
    const name = first.replace(/[#*_>-]/g, "").trim().slice(0, 120) || "Untitled";
    const node: GraphNode = {
      "@id": iri(slugify(name)),
      "@type": hintType,
      name,
    };
    const description = rest.join(" ").trim();
    if (description) node.description = description.slice(0, 500);
    return [node];
  }
}

/** Optional: extract structured nodes with Claude via the Messages API. */
export class ClaudeExtractor implements Extractor {
  readonly id = "claude";

  constructor(
    private apiKey: string,
    private baseUrl = process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com",
    private model = process.env.AI_EXTRACTION_MODEL ?? "claude-haiku-4-5-20251001",
  ) {}

  async extract(text: string, hintType = "Thing"): Promise<GraphNode[]> {
    const prompt =
      `Extract the entities in the text below as a JSON array of schema.org nodes. ` +
      `Each node must have "@type" (a schema.org type, prefer "${hintType}" when apt) and "name", ` +
      `plus any other schema.org properties you can ground in the text. ` +
      `Respond with ONLY the JSON array.\n\n---\n${text}`;

    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);

    const payload = (await res.json()) as { content?: Array<{ text?: string }> };
    const raw = payload.content?.map((b) => b.text ?? "").join("") ?? "[]";
    const json = raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1);
    const parsed = JSON.parse(json) as Array<Record<string, unknown>>;

    return parsed
      .filter((n) => typeof n.name === "string")
      .map((n) => ({
        "@id": iri(slugify(String(n.name))),
        "@type": (n["@type"] as string) ?? hintType,
        ...n,
      })) as GraphNode[];
  }
}

/** Select the extractor: Claude when enabled and keyed, heuristic otherwise. */
export function getExtractor(): Extractor {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (flags.boolean("ai-extraction", false) && apiKey) {
    log.info("ai.extractor.selected", { extractor: "claude" });
    return new ClaudeExtractor(apiKey);
  }
  return new HeuristicExtractor();
}

/** Extract nodes from text using the selected extractor, traced. */
export function extract(text: string, hintType?: string): Promise<GraphNode[]> {
  const extractor = getExtractor();
  return span("ai.extract", () => extractor.extract(text, hintType), { extractor: extractor.id });
}
