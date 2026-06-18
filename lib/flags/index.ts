/**
 * OpenFeature-compliant feature flagging.
 *
 * Implements the OpenFeature evaluation API surface (a provider resolving
 * typed flags against an evaluation context) without pulling the SDK, so the
 * platform can later drop in any OpenFeature provider (flagd, etc.) by
 * swapping `provider` — call sites stay unchanged.
 */

export interface EvaluationContext {
  targetingKey?: string;
  [attr: string]: unknown;
}

export interface FlagProvider {
  readonly name: string;
  resolveBoolean(key: string, defaultValue: boolean, ctx: EvaluationContext): boolean;
  resolveString(key: string, defaultValue: string, ctx: EvaluationContext): string;
}

/**
 * Environment-backed provider: flags come from `FLAG_<KEY>` env vars
 * (e.g. `FLAG_SURREAL_CONNECTOR=true`). Unset flags fall back to the default.
 */
class EnvProvider implements FlagProvider {
  readonly name = "environment";

  private raw(key: string): string | undefined {
    return process.env[`FLAG_${key.toUpperCase().replace(/[.-]/g, "_")}`];
  }

  resolveBoolean(key: string, defaultValue: boolean): boolean {
    const v = this.raw(key);
    if (v === undefined) return defaultValue;
    return v === "true" || v === "1" || v === "on";
  }

  resolveString(key: string, defaultValue: string): string {
    return this.raw(key) ?? defaultValue;
  }
}

const provider: FlagProvider = new EnvProvider();

/** OpenFeature-style typed accessors. */
export const flags = {
  boolean(key: string, defaultValue = false, ctx: EvaluationContext = {}): boolean {
    return provider.resolveBoolean(key, defaultValue, ctx);
  },
  string(key: string, defaultValue = "", ctx: EvaluationContext = {}): string {
    return provider.resolveString(key, defaultValue, ctx);
  },
  providerName(): string {
    return provider.name;
  },
};

/** Well-known flag keys used across the platform. */
export const FLAGS = {
  SURREAL_CONNECTOR: "surreal-connector",
  WRITE_API: "write-api",
} as const;
