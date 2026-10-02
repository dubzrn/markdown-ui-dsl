# ADR-002 — Stack and pinned versions

Status: Accepted · Date: 2026-10-01 · Implements: T-002 · Assumption A2 (names `mdui` / `@mdui/*`) stands until the maintainer answers SPEC §0.

## Decision

Node ≥ 20.19 (CI on 22), pnpm 10, TypeScript, Vitest, fast-check, tsup (ESM + d.ts), ESLint flat config + typescript-eslint,
Prettier, Changesets. Versions are pinned exactly (verified against the npm registry on 2026-10-01):

| Tool              | Pin    | Note                                                                                       |
| ----------------- | ------ | ------------------------------------------------------------------------------------------ |
| typescript        | 6.0.3  | **Not 7.0.2** (latest): typescript-eslint 8.71.0 peers `typescript >=4.8.4 <6.1.0`. Revisit when it widens. |
| vitest            | 5.0.3  | requires Node ^22.12 \|\| ^24 \|\| >=26 for running tests; CI uses Node 22.                |
| fast-check        | 4.10.2 | property tests (parser round-trip, no-throw)                                               |
| tsup              | 8.5.1  | needs `ignoreDeprecations: "6.0"` under TS 6 (its dts step injects `baseUrl`)              |
| eslint            | 10.11.0 | flat config                                                                               |
| typescript-eslint | 8.71.0 |                                                                                            |
| prettier          | 3.9.9  | Markdown docs excluded (hand-formatted)                                                    |
| @changesets/cli   | 3.0.3  |                                                                                            |

`tsconfig.base.json` strictness is adapted from `reference/dsl/wireloom` (MIT): strict, `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`.
Zod (4.6.5) is allowed only outside `core`/`spec` (e.g. `tools`, `mcp`).

## Consequences

Local dev on Node 20 can build but not run Vitest 5; the `engines` floor is for consumers of published packages.
