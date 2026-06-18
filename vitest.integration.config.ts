import { defineConfig } from "vitest/config";

// Integration tests (Testcontainers). Kept separate from the fast unit suite
// so `npm test` stays deterministic and Docker-free.
export default defineConfig({
  resolve: {
    alias: { "@": import.meta.dirname },
  },
  test: {
    environment: "node",
    include: ["tests-integration/**/*.it.test.ts"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
