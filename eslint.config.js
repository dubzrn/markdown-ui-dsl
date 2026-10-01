import js from "@eslint/js";
import tseslint from "typescript-eslint";

// ADR-003: dependency rule. `spec` and `core` are zero-dependency and platform-neutral
// (no Node APIs, no DOM, no other @mdui packages except spec -> nothing, core -> spec).
const NODE_BUILTINS = [
  "fs",
  "path",
  "os",
  "child_process",
  "crypto",
  "http",
  "https",
  "net",
  "stream",
  "url",
  "util",
  "zlib",
  "worker_threads",
  "process",
  "buffer",
  "events",
  "readline",
  "module",
].flatMap((m) => [m, `node:${m}`, `${m}/*`, `node:${m}/*`]);

const banned = (extra = []) => ({
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        { group: NODE_BUILTINS, message: "ADR-003: core/spec must not use Node APIs." },
        {
          group: ["@mdui/*", ...extra],
          message: "ADR-003: this package may not import that @mdui package.",
        },
      ],
    },
  ],
  "no-restricted-globals": [
    "error",
    { name: "process", message: "ADR-003: no Node globals in core/spec." },
    { name: "Buffer", message: "ADR-003: no Node globals in core/spec." },
    { name: "require", message: "ADR-003: ESM only." },
  ],
});

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "reference/**",
      ".agents/**",
      ".claude/**",
      "graphify-out/**",
      "node_modules/**",
      ".tools/**",
      "examples/**",
      "skills/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    // Node-side tooling may use Node globals; core/spec sources (below) may not.
    files: ["scripts/**/*.{mjs,ts}", "bench/**/*.mjs", "tests/**/*.ts", "packages/*/test/**/*.ts"],
    languageOptions: { globals: { process: "readonly", console: "readonly", URL: "readonly" } },
  },
  {
    files: ["packages/spec/src/**/*.ts"],
    rules: banned(),
  },
  {
    files: ["packages/core/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: NODE_BUILTINS, message: "ADR-003: core must not use Node APIs." },
            {
              group: ["@mdui/*", "!@mdui/spec"],
              message: "ADR-003: core may only import @mdui/spec.",
            },
          ],
        },
      ],
      "no-restricted-globals": banned()["no-restricted-globals"],
    },
  },
);
