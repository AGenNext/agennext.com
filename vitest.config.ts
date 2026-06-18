import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Resolve the "@/*" path alias (mirrors tsconfig.json) so tests import the
// same modules the app does.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
