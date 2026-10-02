# ADR-003 — Package boundaries and the dependency rule

Status: Accepted · Date: 2026-10-01 · Implements: T-002

## Decision

`@mdui/spec` → no dependencies. `@mdui/core` → `@mdui/spec` only. All other packages may depend downward only
(see the graph in `docs/PLAN.md`). `spec` and `core` are platform-neutral: **no Node built-ins, no Node globals, no DOM**.

Enforced in `eslint.config.js` via `no-restricted-imports` / `no-restricted-globals`; `pnpm lint` runs in CI (T-003).
Demonstrated 2026-10-01: adding `import { readFileSync } from "node:fs"` to `packages/core/src` fails lint with
`ADR-003: core must not use Node APIs`.

## Consequences

File I/O lives in `@mdui/tools` / `@mdui/cli`; `core` accepts strings. Browser, edge and VS Code web hosts can embed `core` unchanged.
