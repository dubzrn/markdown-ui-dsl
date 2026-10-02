import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/test/**/*.test.ts", "tests/**/*.test.ts"],
    environment: "node",
    // property/fuzz suites run thousands of cases; a loaded CI runner is several times slower than a laptop
    testTimeout: 60_000,
  },
});
