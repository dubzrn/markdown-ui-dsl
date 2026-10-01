# Task Breakdown — Markdown-UI DSL v2 Program

| | |
|---|---|
| **Status** | Ready for sprint planning · prepared 2026-10-01 |
| **Inputs** | [`FEATURE_ADDITIONS.md`](FEATURE_ADDITIONS.md) (scope) · [`SPEC.md`](SPEC.md) (requirements `REQ-*`) · [`PLAN.md`](PLAN.md) (order, phases, checkpoints) |
| **Tasks** | 84 across 7 phases (0–6) · rev. 3 of 2026-10-01 (rev. 2: +T-094, T-095, T-111, −T-109, 14 amended; rev. 3: +T-006 and per-task `reference/` paths on 43 tasks) · IDs are sparse by design (a range per phase); gaps are not missing tasks |
| **Traceability** | Every feature ID (48) and every `REQ-*` appears below; `scripts/check-traceability.ts` (T-005) enforces it in CI |

---

## Conventions

**Size** (relative; calendar estimates are in PLAN §9 and assume one developer working with coding agents):
`XS` ≈ 1 file / trivial · `S` ≈ 1–2 files · `M` ≈ 3–5 files · `L` ≈ 5–8 files or a cross-cutting concern.
**Every `L` task must be split into ≤ `M` sub-tasks at the start of its phase** — the suggested split is given in each. No task is `XL`.

**Definition of Done (applies to every task, in addition to its own criteria):**
1. `pnpm lint && pnpm typecheck && pnpm test` pass; new behaviour has tests at the layer named in *Verify*.
2. Conformance fixtures added/updated if language behaviour changed; all v1 examples still parse (T-024 gate).
3. Public API/CLI/diagnostic changes documented; a Changeset exists.
4. No new runtime dependency in `@mdui/core`/`@mdui/spec` without sign-off (SPEC §7).
5. Traceability fields (`Implements`, `REQ`) are correct.
6. **Reference first:** the *Reference* line of the task (paths under `reference/`) was consulted; anything lifted went through `scripts/reference.sh lift`, and the PR states what was **improved over upstream**.

**Fields:** `Size` · `Deps` (must be done first) · `Implements` (feature IDs) · `REQ` (SPEC §8) · **Do** · **Done when** · **Verify**.

**Parallelism:** tasks with no mutual dependency in the same phase can run concurrently (PLAN §5).

---

## Phase 0 — Foundations & hygiene
*Goal: a safe place to build, and the repo's own defects fixed first. Slice delivered: green CI + clean examples.*

## Progress

| Task | Status | Evidence |
|---|---|---|
| T-001 | done | examples balanced (`scripts/check-examples.py`) |
| T-002 | done | `pnpm check` green; lint rejects `node:` imports in core (ADR-003) |
| T-003 | done* | CI green on `ed0a63a` (7/7 jobs); *red-on-unbalanced demo on a scratch branch still pending (needs permission to push a second branch) |
| T-004 | done | CONTRIBUTING, RFC template, CHANGELOG |
| T-005 | done | `node scripts/check-traceability.ts` (48/55/84), unit tests |
| T-006 | done | `scripts/check-repo-hygiene.py`, seeded violations demonstrated |
| T-010 | done | `packages/spec/grammar/v1.ebnf` + `v1.md` |
| T-011 | done | ADR-005, fixtures `D1…D12` |
| T-013 | done | 87 valid + 61 invalid fixtures, schema, protocol, Python runner (`conformance/`) |
| T-014 | done | `packages/core/src/diagnostics.ts` |
| T-015 | done | block parser; 148/148 conformance; 150k-input fuzz |
| T-016 | done | `inline.ts`; 68 inline fixtures; 100k no-throw + 50k print-stability property; all example text resolves to typed nodes |
| SP-4 | partial | baseline vs A2UI (-85.8% tokens, o200k); re-run after 2.0 syntax; json-render & OpenUI Lang pending (`docs/spikes/SP-4-token-cost.md`) |
| T-012 | done | `docs/rfcs/0001-dsl-2.0-syntax.md`, `v2.ebnf`; maintainer read of §7 pending |
| T-017 | done | `frontmatter.ts`; 57 fixtures; decimals-stay-strings decision (ADR-004 addendum) |
| T-018 | done | env directives gated on `dsl: 2.0`; 25 v2 fixtures; responsive-layout directive snapshot |
| T-020 | done | typed closers (E1004), attribute lists, field attrs; 45 block fixtures + inline attrs |
| T-021 | done | 13 widget primitives + 10 container kinds + labelled divider; validated args (E1301/E1302) |
| T-019 | next (after T-022..T-026, AST still moving) | AST types + JSON Schema |

### T-001 · Fix example and documentation defects
`S` · Deps: — · Implements: **QLT-04** · REQ: REQ-QLT-04
- **Do:** Rebalance `action-tracker-detail`, `action-tracker-master`, `chat-interface`, `mobile-app-layout` (research B-01: stray trailing `||| COLUMN |||` where the outer `--- END ---` belongs; outer block unclosed). Fix dead refs (`examples/design-system.md` → `examples/design-systems/`; `TESTING.md` skill filename) (B-02). Replace the prose-abuse `[ text: 75% complete (progress bar) ]` with plain v1-valid text until `PROGRESS` exists (B-06). Fix duplicate README install numbering.
- **Done when:** a block-balance count over `examples/*.ui.md` gives delta 0 for all 7; README/TESTING links resolve; diff reviewed by maintainer for *intent preservation* (layout meaning unchanged).
- **Verify:** scripted balance count (throwaway; superseded by T-003/T-027); link check.

### T-002 · Monorepo scaffold and architecture decision records
`M` · Deps: — · Implements: *(enabler for all)* · REQ: —
- **Do:** pnpm workspace, strict `tsconfig.base`, Vitest, fast-check, ESLint, Prettier, Changesets. ADR-001 parser strategy (SPEC §4); ADR-002 stack and **pinned versions** (verify current releases; confirm names `mdui`/`@mdui/*`, assumption A2); ADR-003 package boundaries + lint-enforced dependency rule (`core`/`spec` zero deps, no Node APIs); ADR-004 frontmatter YAML approach (bundled **strict subset** parser in `core`; full YAML only in `tools`/`tokens`).
- **Done when:** `pnpm install && pnpm build && pnpm test` green on an empty `@mdui/core`; dependency-rule lint fails when a banned import is added (demonstrated).
- **Verify:** CI dry-run; deliberate-violation test.

### T-003 · Continuous integration
`S` · Deps: T-002 · Implements: **QLT-04** · REQ: REQ-QLT-04
- **Do:** GitHub Actions: lint, typecheck, test, build on Node 20 & 22; **example gate** job (initially the balance script from T-001, switched to `mdui validate`/`lint` in T-027/T-028); required-check documentation.
- **Done when:** CI green on a PR; a deliberately unbalanced example turns it red (demonstrated on a scratch branch).
- **Verify:** both runs linked in the PR description.

### T-004 · Governance and contributor docs
`S` · Deps: — · Implements: **QLT-05**, **AGT-01** (contributor `AGENTS.md`) · REQ: —
- **Do:** *(root `AGENTS.md` and `CLAUDE.md` already exist — extend them)* `CONTRIBUTING.md`, RFC process + `docs/rfcs/0000-template.md`, `CHANGELOG.md`, versioning policy (toolchain semver; DSL version = `dsl:` key), contributor `AGENTS.md` (commands, boundaries from SPEC §7), update `.github/ISSUE_TEMPLATE/feature_request.md` to point at the RFC process.
- **Done when:** a new contributor can find commands, boundaries and RFC process from `README` in ≤ 2 clicks; template renders.
- **Verify:** maintainer review; link check.
- **Reference (lift/study, see `reference/README.md`):** `reference/dsl/wireloom`, `reference/sdd/spec-kit`, `reference/sdd/agentskills`, `reference/sdd/agents-md`

### T-005 · Traceability checker
`S` · Deps: T-002 · Implements: *(governance)* · REQ: —
- **Do:** `scripts/check-traceability.ts`: parse FEATURE_ADDITIONS register, SPEC `REQ-*` list and TASKS `Implements`/`REQ` fields; fail on a feature with no task, a REQ with no task, or an unknown ID.
- **Done when:** passes on this document set; fails on seeded gaps.
- **Verify:** unit tests with fixture markdown; wired into CI.

---

## Phase 1 — Language core
*Goal: a published grammar, a conformant parser and AST, and a CLI that validates specs. Slice delivered: `mdui validate|lint|ast` on v1 and v2 specs with a conformance suite.*

### T-006 · Reference-library hygiene and CI guards
`S` · Deps: T-002, T-003 · Implements: **QLT-06** · REQ: REQ-QLT-06
- **Do:** exclude `reference/**`, `.agents/**`, `.claude/**` and `graphify-out/**` from ESLint, Prettier, Vitest, `tsc` project references, coverage, knip/dependency checks, Changesets and the traceability script; add CI job `skills-check` (`python3 scripts/skills.py verify` + `validate`) and a graph-freshness warning; CI job `reference-check` running `python3 scripts/reference-manifest.py --check`, a guard that fails if `packages/**` imports from `reference/**`, a check that every `THIRD_PARTY_NOTICES.md` destination exists, and `git submodule status` shows no unintended pin changes; document `git clone --recurse-submodules --shallow-submodules` and the `scripts/reference.sh init <group>` flow in `CONTRIBUTING.md`.
- **Done when:** the guards fail on three seeded violations (an import from `reference/`, a missing notices destination, a manifest path that no longer exists) and pass on the clean tree; builds/tests/lint are unaffected by an initialised `reference/` (timings recorded).
- **Verify:** CI run + seeded-violation branch.
- **Reference (lift/study, see `reference/README.md`):** `scripts/reference.sh`, `scripts/reference-manifest.py`, `reference/manifest.json`

### T-010 · Normative grammar for v1.0.3
`M` · Deps: — · Implements: **LNG-01** · REQ: REQ-LNG-01
- **Do:** EBNF in `packages/spec/grammar/v1.ebnf` + prose for every construct in SKILL.md; list ambiguities discovered (bracket forms, `---`).
- **Done when:** every construct has a production; all 7 (fixed) examples hand-traced; ambiguity list handed to T-011.
- **Verify:** review; later automated by T-058 parity.

### T-011 · Ambiguity and escaping decisions
`S` · Deps: T-010 · Implements: **LNG-09** · REQ: REQ-LNG-09
- **Do:** ADR fixing bracket precedence, `---` position rule, escape set, literal contexts (SPEC §2.2 *Escaping*).
- **Done when:** each decision has ≥ 2 positive and ≥ 2 negative fixture cases.
- **Verify:** fixtures added to T-013 corpus.

### T-012 · RFC-0001 — DSL 2.0 syntax
`L` · Deps: T-010, T-011, T-004 · Implements: **LNG-02, LNG-03, LNG-04, LNG-05, LNG-06, LNG-07, LNG-08, LNG-10, LNG-11, LNG-13** · REQ: —
- **Split:** (a) attributes/closers/field attrs; (b) primitives; (c) states + data + include; (d) flows + actions + env directives + constraints syntax.
- **Do:** turn SPEC §2.2 drafts into an accepted RFC with grammar productions, diagnostics, and rationale; **readability review** — every construct appears in a short example, and any construct needing more than one sentence to explain is flagged for simplification.
- **Done when:** maintainer accepts; SPEC §2.2 updated to final; productions added to `v2.ebnf`.
- **Verify:** RFC review; examples lint after T-020…T-025.

### T-013 · Conformance corpus v1 and protocol
`M` · Deps: T-010 · Implements: **QLT-01** · REQ: REQ-QLT-01
- **Do:** fixture schema (`{id, input, expect:{ast?, diagnostics[]}, since, notes}`); ≥ 60 valid + ≥ 60 invalid fixtures; include the 7 fixed examples as valid and the **original 4 broken examples as invalid regression fixtures**; runner protocol doc for third-party implementations.
- **Done when:** corpus validates against its own schema; protocol doc lets a non-TS implementation run it.
- **Verify:** schema validation test; one throwaway Python runner stub proves language-neutrality.
- **Reference (lift/study, see `reference/README.md`):** `reference/protocols/a2ui`

### T-014 · Diagnostics model and code registry
`S` · Deps: T-002 · Implements: **TLS-01** · REQ: REQ-TLS-01
- **Do:** `Diagnostic`/`Span`/`TextEdit` types; code-range registry (SPEC §2.4) with a doc string per code.
- **Done when:** codes unique; registry exported; docs generated.
- **Verify:** unit test for uniqueness and range validity.

### T-015 · Block parser
`L` · Deps: T-010, T-013, T-014 · Implements: **LNG-01, TLS-01** · REQ: REQ-LNG-01, REQ-TLS-01
- **Split:** (a) line classifier/lexer; (b) block stack + nesting + closers; (c) error recovery.
- **Do:** containers, surfaces, dividers, hints, comments, lists, tables, code fences; precise spans; recovery that continues after bad lines.
- **Done when:** all valid v1 fixtures parse with zero errors; invalid fixtures yield exactly the expected diagnostics; parser **never throws** on ≥ 100k random inputs.
- **Verify:** conformance runner + fast-check fuzz.
- **Reference (lift/study, see `reference/README.md`):** `reference/dsl/markdoc`, `reference/dsl/wiremd`

### T-016 · Inline parser (v1 components)
`L` · Deps: T-015, T-011 · Implements: **LNG-01, LNG-09** · REQ: REQ-LNG-01, REQ-LNG-09
- **Split:** (a) buttons/links/tabs; (b) inputs/choices/toggles/dropdown(+`dynamic`); (c) badge/IMG/escapes.
- **Done when:** every v1 inline construct yields a typed node; escapes and code spans are literal; precedence per T-011.
- **Verify:** fixtures; property: `parse(print(node))` stable.
- **Reference (lift/study, see `reference/README.md`):** `reference/dsl/markdoc`, `reference/dsl/wiremd`
- **Then:** run **spike SP-4** (PLAN §5) — a 2-day token-cost baseline of mdui vs A2UI JSON/Express, json-render and OpenUI Lang on three scenarios — before RFC-0001 freezes syntax that could be made cheaper.

### T-017 · Frontmatter parser and schema
`M` · Deps: T-015, T-014 · Implements: **LNG-10** · REQ: REQ-LNG-10
- **Do:** strict YAML-subset parser inside `core` (scalars, maps, lists, flow style), documented subset; unsupported syntax ⇒ `E1102`, never silent mis-parse; key schema (SPEC §2.2, incl. rev. 2 `title`/`caption`/`legend` metadata); unknown keys ⇒ warning; `dsl:` handling (absent ⇒ 1.x).
- **Done when:** all frontmatter in examples parses; unsupported constructs produce diagnostics; ≥ 30 fixtures.
- **Verify:** conformance + fuzz.

### T-018 · Directive parser (responsive and environment)
`M` · Deps: T-015 · Implements: **LNG-13** · REQ: REQ-LNG-13
- **Do:** `> @<bp> token: value, …` (existing semantics: mobile-first, additive, attaches to nearest enclosing block) plus `@dark|@light|@print|@reduced-motion|@contrast-more|@touch|@hover`, combinable; non-`@` hints unchanged.
- **Done when:** v1 responsive example AST unchanged; env directives parse; stacking/ordering fixtures pass.
- **Verify:** fixtures; snapshot of `responsive-layout.ui.md` AST.

### T-019 · AST types and JSON Schema
`M` · Deps: T-015 · Implements: **TLS-01** · REQ: REQ-TLS-01
- **Do:** AST types (SPEC §2.3), Zod definitions, generated versioned JSON Schema in `@mdui/spec`.
- **Done when:** every conformance AST validates; schema `$id` encodes the DSL version; breaking-change policy documented.
- **Verify:** schema validation over the whole corpus.
- **Reference (lift/study, see `reference/README.md`):** `reference/dsl/markdoc`

### T-020 · v2 syntax — typed closers, attributes, field attributes
`M` · Deps: T-012, T-016 · Implements: **LNG-02, LNG-03** · REQ: REQ-LNG-02, REQ-LNG-02b, REQ-LNG-03
- **Do:** typed closers + mismatch diagnostic `E1004`; `{: … }` attribute lists on components and block openers; field attribute vocabulary with value validation.
- **Done when:** dropdown option braces never parsed as attributes; mismatched closers diagnosed with expected kind; attribute round-trips.
- **Verify:** ≥ 40 new fixtures; property test on attribute printing.

### T-021 · v2 syntax — new primitives
`L` · Deps: T-012, T-016 · Implements: **LNG-04** · REQ: REQ-LNG-04
- **Split:** (a) form-like widgets (slider/date/file/progress); (b) data-like (chart/stat/skeleton/avatar/icon/crumbs/pager/stepper); (c) containers (grid/accordion/panel/drawer/toast/tooltip/callout/empty); (d) **rev. 2 — Salt-derived:** `TREE` (+ tree-table), `GROUP` (titled group box), `MENUBAR`, `{: scroll=x|y|both }`, labelled dividers, named `ICON` set [S12].
- **Done when:** each primitive has a typed node, argument validation with fix hints, and a fixture pair.
- **Verify:** conformance; example per primitive added to `examples/`.
- **Reference (lift/study, see `reference/README.md`):** `reference/dsl/markdown-ui`

### T-022 · v2 syntax — regions/states, data model, binding
`L` · Deps: T-012, T-017, T-020 · Implements: **LNG-05, LNG-06** · REQ: REQ-LNG-05, REQ-LNG-06
- **Split:** (a) REGION/STATE parsing; (b) EACH/IF parsing; (c) binding resolution vs `data:` (inline, file via injected reader, JSON Schema).
- **Done when:** `{{ path }}` resolves or yields `E2101`; **no operators/functions are parsed** (negative fixtures); `W3201` for missing `default` state.
- **Verify:** fixtures; fuzz for path-injection strings.

### T-023 · Include resolver
`M` · Deps: T-012, T-017, T-022 · Implements: **LNG-07** · REQ: REQ-LNG-07
- **Do:** `[[ USE: path ]]{: props }` resolution through an **injected `readFile`** (core stays I/O-free); props binding; root-sandbox check; depth ≤ 8; cycle detection.
- **Done when:** `..`-escape ⇒ `E2301` and the file is never read; cycle ⇒ `E2302`; props visible as `{{ props.x }}`.
- **Verify:** security fixtures; fake-FS tests.

### T-024 · v1 compatibility gate
`S` · Deps: T-016, T-020 · Implements: **LNG-10** · REQ: REQ-LNG-10
- **Do:** CI job asserting each v1 fixture/example yields an equal AST (modulo spans) with and without `dsl: 2.0` where semantics are shared; failure blocks merge.
- **Done when:** gate green; documented as release-blocking.
- **Verify:** deliberate-regression test.

### T-025 · Flow parser and navigation graph
`M` · Deps: T-012, T-017 · Implements: **LNG-08** · REQ: REQ-LNG-08
- **Do:** `type: flow` documents: screens table, transitions list, `start`, `terminal`; graph model; reference validation (`E2401`) against screen files' `#actions`.
- **Done when:** graph exposes reachability, depth, dead-ends (inputs for NOV-04); unknown refs diagnosed.
- **Verify:** fixtures with cycles and unreachable nodes.
- **Reference (lift/study, see `reference/README.md`):** `reference/dsl/wiremark`

### T-026 · Action registry
`S` · Deps: T-017, T-020 · Implements: **LNG-11** · REQ: REQ-LNG-11
- **Do:** `actions:` schema (`intent`, `destructive`, `confirm`); link buttons to registry; unknown target diagnostics.
- **Done when:** registry resolved onto button nodes; destructive flag available to lint/constraints.
- **Verify:** fixtures.

### T-027 · CLI skeleton: `validate`, `ast`
`M` · Deps: T-015, T-016, T-019 · Implements: **TLS-02, TLS-01** · REQ: REQ-TLS-02, REQ-TLS-01
- **Do:** `mdui` binary, glob handling, `--json`, `--fail-on`, exit-code contract (0/1/2/3), config loading; switch the example gate to `mdui validate`.
- **Done when:** exit codes verified for each outcome; JSON output schema documented.
- **Verify:** CLI snapshot tests; example gate uses the real tool.
- **Reference (lift/study, see `reference/README.md`):** `reference/dsl/wiremd`

### T-028 · Lint engine MVP and structural rules
`M` · Deps: T-027 · Implements: **TLS-03** · REQ: REQ-TLS-03
- **Do:** rule API, reporter, six structural rules: `balanced-blocks`, `orphan-closer`, `duplicate-id`, `unknown-directive`, `empty-container`, `broken-link-or-include`; `mdui lint`; add lint to the example gate.
- **Done when:** the **four original defective examples fail** `balanced-blocks` with correct spans (regression fixtures from T-013); fixed examples pass.
- **Verify:** rule unit tests + gate.

> **Checkpoint 1 (α gate)** — see PLAN §7: grammar published, conformance green, v1 compatible, CLI works, examples clean.

---

## Phase 2 — Tooling and design system
*Goal: authors get formatting, diffing, preview, tokens and a rich linter. Slice delivered: `mdui fmt|diff|render` + DESIGN.md token lint.*

### T-030 · Lint engine completion
`M` · Deps: T-028 · Implements: **TLS-03** · REQ: REQ-TLS-03
- **Do:** config file, per-rule severity overrides, `<!-- mdui-disable rule -->` scoping, `--fix` applying `TextEdit`s with overlap detection, deterministic ordering.
- **Done when:** suppression affects only the next node; overlapping fixes are skipped with a notice; fix application is idempotent.
- **Verify:** unit + property (apply twice = once).
- **Reference (lift/study, see `reference/README.md`):** `reference/dsl/markdoc`

### T-031 · Semantic and flow lint rules
`M` · Deps: T-030, T-022, T-025, T-026 · Implements: **TLS-03** · REQ: REQ-TLS-03
- **Do:** rules for unresolved bindings, unknown attributes/values, missing `default` state, unknown action targets, unknown flow refs, include cycles, nesting-depth limit, destructive-action-without-confirm hook.
- **Done when:** each rule has pass/fail fixtures and a documented code.
- **Verify:** rule tests.

### T-032 · Accessibility semantics and rules
`M` · Deps: T-030, T-020 · Implements: **QLT-03** · REQ: REQ-QLT-03
- **Do:** ≥ 8 rules: `input-label`, `img-alt`, `heading-order`, `single-h1`, `button-text`, `link-text`, `duplicate-landmark`, `target-size-annotation` (WCAG 2.2 2.5.8 [S95]), `live-region-misuse`; WCAG-2.2 mapping table in docs (verify against canonical W3C text before release — canonical site unreachable during research).
- **Done when:** each rule maps to a cited criterion; fixtures pass/fail.
- **Verify:** rule tests; mapping table reviewed.
- **Reference (lift/study, see `reference/README.md`):** `reference/verification/axe-core`

### T-034 · Canonical formatter
`M` · Deps: T-020, T-018 · Implements: **TLS-04** · REQ: REQ-TLS-04
- **Do:** `mdui fmt [--check]`: stable attribute order, spacing, closer style preserved (typed vs generic), comments preserved.
- **Done when:** `fmt(fmt(x)) = fmt(x)` and `parse(fmt(x)) ≡ parse(x)` over the corpus and ≥ 10k generated inputs.
- **Verify:** fast-check properties; golden files.
- **Reference (lift/study, see `reference/README.md`):** `reference/dsl/markdoc`

### T-035 · Semantic diff
`M` · Deps: T-019 · Implements: **TLS-05** · REQ: REQ-TLS-05
- **Do:** tree diff (added/removed/moved/changed) using anchor-friendly matching; human + JSON output; exit 1 on regressions (removed required node, a11y rule newly failing).
- **Done when:** moves detected as moves (not delete+add) on fixtures; JSON schema documented.
- **Verify:** golden diffs.
- **Reference (lift/study, see `reference/README.md`):** `reference/tokens/design-md`, `reference/sdd/openspec`

### T-036 · Migrate tool
`S` · Deps: T-024, T-020 · Implements: **LNG-10** · REQ: REQ-LNG-10
- **Do:** `mdui migrate [--write]`: adds `dsl:`, converts safe v1 idioms (e.g. placeholder-prose widgets to primitives when unambiguous); lists manual items.
- **Done when:** migrated output parses with equal-or-richer AST; nothing changed that isn't listed.
- **Verify:** golden migrations.

### T-037 · Design-system loader (DESIGN.md + legacy)
`M` · Deps: T-017 · Implements: **DSY-01** · REQ: REQ-DSY-01
- **Do:** parse Google DESIGN.md front matter (colors, typography, rounded, spacing, components, `{ref}`) and section prose [S54]; keep legacy prose design systems working; pin DESIGN.md spec version, report mismatches; `mdui:` extension block for breakpoints/framework mapping.
- **Done when:** the three existing example design systems load; a sample DESIGN.md loads; version mismatch is a warning, not a crash.
- **Verify:** fixtures incl. upstream sample files.
- **Reference (lift/study, see `reference/README.md`):** `reference/tokens/design-md`

### T-038 · Token references and exporters
`M` · Deps: T-037 · Implements: **DSY-02** · REQ: REQ-DSY-02
- **Do:** resolve `{colors.primary}` chains with cycle detection; exporters: DTCG, Tailwind v3 JSON, Tailwind v4 `@theme`, CSS variables [S54][S60]; Style Dictionary bridge **only if DTCG support is confirmed** (its README does not state it; Amazon origin also unconfirmed [S63]) — otherwise a native DTCG exporter.
- **Done when:** exported DTCG validates against the DTCG format; round-trip preserves references.
- **Verify:** golden outputs; DTCG validation.
- **Reference (lift/study, see `reference/README.md`):** `reference/tokens/design-md`, `reference/tokens/dtcg`, `reference/tokens/style-dictionary`

### T-039 · Token lint and token diff
`M` · Deps: T-038, T-030, T-035 · Implements: **DSY-03, TLS-05** · REQ: REQ-DSY-03, REQ-TLS-05
- **Do:** `broken-ref` (error), `contrast-ratio` (WCAG AA 4.5:1 on declared component pairs), `orphaned-token`, `unknown-breakpoint`, `missing-primary`; token deltas in `diff` with regression exit.
- **Done when:** contrast computation matches reference values on a published test vector set; **total lint rules ≥ 30 asserted by a test**.
- **Verify:** vectors; rule-count test.
- **Reference (lift/study, see `reference/README.md`):** `reference/tokens/design-md`

### T-040 · HTML renderer
`L` · Deps: T-021, T-022, T-018 · Implements: **TLS-06, LNG-03, LNG-05, LNG-13** · REQ: REQ-TLS-06, REQ-LNG-03, REQ-LNG-05, REQ-LNG-13
- **Split:** (a) node→semantic HTML (landmarks, roles); (b) styles `sketch|clean|wireframe|none`; (c) responsive/env CSS + state variants.
- **Done when:** output uses semantic elements and ARIA matching the SPEC mapping; required/type attributes reflected; every state renders; preview chrome itself passes axe (dogfooding [S93]).
- **Verify:** golden HTML; axe run on rendered examples.
- **Reference (lift/study, see `reference/README.md`):** `reference/dsl/wiremd`

### T-041 · Preview server and toggles
`S` · Deps: T-040 · Implements: **TLS-06, LNG-05, LNG-13** · REQ: REQ-TLS-06, REQ-LNG-05, REQ-LNG-13
- **Do:** `render --watch`, live reload, viewport/theme/state toggles; **rev. 2:** `--scale <n|WxH>` and `--dpi`, and a handwritten/sketch option (Salt parity [S12]).
- **Done when:** edit→update ≤ 500 ms (measured); toggles switch breakpoint/theme/state.
- **Verify:** e2e smoke with Playwright; timing assertion with tolerance.
- **Reference (lift/study, see `reference/README.md`):** `reference/dsl/wiremd`

### T-042 · Streaming incremental parser
`L` · Deps: T-021, T-022 · Implements: **TLS-07** · REQ: REQ-TLS-07
- **Split:** (a) incremental line buffer + partial-block state; (b) partial AST + retraction events; (c) equivalence harness.
- **Done when:** for ≥ 10k random chunkings the streamed final AST equals batch AST; partial ASTs never expose a node later silently removed (only via retraction events); handles half-typed attribute lists and tags.
- **Verify:** fast-check chunking property; fixtures for pathological splits (inside `{: `, inside `[[ USE`).
- **Reference (lift/study, see `reference/README.md`):** `reference/dsl/mdocui`, `reference/dsl/openui`, `reference/protocols/json-render`, `reference/protocols/hashbrown`

### T-044 · Benchmark harness and performance budgets
`S` · Deps: T-027, T-042 · Implements: *(quality)* · REQ: —
- **Do:** `pnpm bench` (parse, format, lint, stream chunk); record reference hardware; tune the proposed budgets (parse 1,000 lines ≤ 50 ms; chunk ≤ 5 ms) or revise them in SPEC §6 with data; CI trend + >20% regression fail.
- **Done when:** budgets are measured, recorded, and enforced.
- **Verify:** bench output committed as baseline.

> **Checkpoint 2** — PLAN §7: formatter/diff/preview/streaming/tokens/lint (≥ 30 rules).

---

## Phase 3 — Agent integration, evals and the grammar pack
*Goal: agents get a small skill, a project-specific prompt, safe tooling, MCP, measurable evals — and valid-by-construction generation. Slice delivered: β release.*

### T-050 · Component catalog schema and loader
`M` · Deps: T-017, T-019 · Implements: **DSY-04** · REQ: REQ-DSY-04
- **Do:** `mdui.catalog.yaml` (built-in primitives + project components, prop schemas, trust level `core|project|third-party`); default catalog for all primitives; loader + validation.
- **Done when:** default catalog covers every built-in; custom components typed; trust levels exposed to lint.
- **Verify:** fixtures.
- **Reference (lift/study, see `reference/README.md`):** `reference/dsl/mdocui`, `reference/protocols/genui`, `reference/protocols/json-render`, `reference/protocols/tambo`, `reference/protocols/hashbrown`

### T-051 · Catalog lint rules
`S` · Deps: T-050, T-030 · Implements: **DSY-04** · REQ: REQ-DSY-04
- **Do:** `E6001` unknown component, `E6002` prop violation, `W6003` third-party component without explicit allow.
- **Done when:** diagnostics point to the offending node with fix hints (nearest catalog name).
- **Verify:** rule tests.

### T-052 · Component map
`M` · Deps: T-050 · Implements: **DSY-06** · REQ: REQ-DSY-06
- **Do:** `mdui.map.yaml` schema/loader (primitive/catalog item → code component, import path, prop mapping) [S65]. *Stretch:* auto-populate from a Storybook components manifest [S72] — target the manifests, **not** the archived `storybookjs/mcp` package (moved into the main Storybook repo, v10.6.0 [S130]); if it exceeds one day, defer to 2.1 via RFC.
- **Done when:** map resolves for the three framework examples; unknown mappings diagnosed (`E6101`).
- **Verify:** fixtures.
- **Reference (lift/study, see `reference/README.md`):** `reference/tokens/code-connect`

### T-053 · Agent Skills restructure
`M` · Deps: T-012, T-054, T-055 · Implements: **AGT-01** · REQ: REQ-AGT-01
- **Do:** convert `skills/markdown-ui-dsl/` to the Agent Skills layout (`SKILL.md` + `references/` for syntax, v2 additions, sync protocol, safety; `scripts/` for validators) [S89]; validate with `skills-ref validate` against the verified limits [S131]; **read the findings of [S111]** and record in an ADR how they change the amount of context shipped; keep the skill fully usable **without** the toolchain; update README install sections.
- **Done when:** passes the standard's validator; **limits met: `SKILL.md` ≤ 500 lines, body < 5,000 tokens, `name` ≤ 64 chars, `description` ≤ 1,024, `compatibility` ≤ 500, references one level deep** [S131]; a no-tooling agent run still produces valid specs (checked in T-063).
- **Verify:** validator; eval run.
- **Reference (lift/study, see `reference/README.md`):** `reference/dsl/mdocui`, `reference/dsl/wiremark`, `reference/dsl/wireloom`, `reference/sdd/agentskills`, `reference/sdd/agents-md`

### T-054 · Prompt generator
`M` · Deps: T-050, T-037, T-012 · Implements: **AGT-02, DSY-06** · REQ: REQ-AGT-02, REQ-DSY-06
- **Do:** `mdui prompt` composes: language reference slice (only used constructs), catalog, tokens, data model, component map, few-shot examples; per-agent flavours; deterministic output.
- **Done when:** byte-identical across runs; a project without charts never mentions `CHART`.
- **Verify:** snapshot; determinism test.
- **Reference (lift/study, see `reference/README.md`):** `reference/dsl/mdocui`, `reference/protocols/json-render`

### T-055 · Safety hardening
`M` · Deps: T-030, T-012 · Implements: **AGT-04** · REQ: REQ-AGT-04
- **Do:** `W7001` instruction-like hint detector; `E7002` URL-scheme allow-list (`http`, `https`, `mailto`, `tel`, in-app `#`/`/` routes); `confirm`/`force` defined **only** as tool parameters (spec text can never grant them); skill/reference text rewritten so hints are layout-only; ≥ 20 injection fixtures.
- **Done when:** fixtures cannot cause lint-clean pass for `javascript:` links or instruction hints; docs state the trust model (spec text = data).
- **Verify:** fixtures; evals in T-063.
- **Reference (lift/study, see `reference/README.md`):** `reference/protocols/ext-apps`

### T-056 · SDD interoperability
`M` · Deps: T-017, T-030 · Implements: **AGT-03** · REQ: REQ-AGT-03
- **Do:** `requirements:` frontmatter + coverage lint; templates and walkthroughs for Spec Kit [S81], OpenSpec [S86] and Kiro (EARS) [S84].
- **Done when:** a sample project shows `.ui.md` participating in each flow; coverage report lists uncovered requirements.
- **Verify:** sample projects lint clean; docs reviewed.
- **Reference (lift/study, see `reference/README.md`):** `reference/sdd/spec-kit`, `reference/sdd/openspec`, `reference/sdd/kiro`

### T-057 · Design-system examples (≥ 4 new)
`M` · Deps: T-037, T-038 · Implements: **DSY-05** · REQ: REQ-DSY-05
- **Do:** React + shadcn (DESIGN.md-based), SwiftUI, Jetpack Compose, Vue/Nuxt, Angular Material, Lit — at least four, each with breakpoint/env mappings.
- **Done when:** each loads, token-lints clean, and passes the example gate.
- **Verify:** gate.

### T-058 · Lark emitter and parity harness
`L` · Deps: T-010, T-013, T-020, T-021, T-022 · Implements: **NOV-03, LNG-01** · REQ: REQ-NOV-03a, REQ-LNG-01
- **Split:** (a) EBNF→Lark transform; (b) grammar-driven string generator; (c) parity runner vs reference parser.
- **Done when:** every valid fixture accepted; ≥ 100k generated strings parse with **zero** errors under the reference parser; invalid fixtures rejected or flagged as "grammar-accepted/semantic-rejected" with an allow-list.
- **Verify:** nightly parity fuzz.
- **Reference (lift/study, see `reference/README.md`):** `reference/protocols/a2ui`, `reference/verification/llguidance`
- **Reference point:** record grammar size/shape vs A2UI's `Express.g4` [S114] for the same UI scenarios (input to T-061).

### T-059 · Catalog-aware dynamic grammar
`L` · Deps: T-058, T-050, T-037, T-022 · Implements: **NOV-03** · REQ: REQ-NOV-03a
- **Split:** (a) component-set restriction; (b) token/data-key enumeration; (c) depth bound + typed-closer matching.
- **Do:** specialise the grammar from catalog + tokens + data model [S103]; options `--max-depth`.
- **Done when:** strings using components/tokens/keys outside the supplied sets are rejected; typed-closer mismatches impossible by grammar.
- **Verify:** negative fixtures; parity fuzz on specialised grammars.
- **Reference (lift/study, see `reference/README.md`):** `reference/verification/llguidance`

### T-060 · GBNF and JSON-Schema emitters; engine matrix
`M` · Deps: T-058 · Implements: **NOV-03** · REQ: REQ-NOV-03a, REQ-NOV-03c
- **Do:** GBNF (llama.cpp) and JSON-schema emitters; test against ≥ 2 engines where installable (llguidance [S100], llama.cpp); publish a **support matrix** including vendors *not verified* in research (A7); OpenAI custom tools accept `lark`/`regex` grammars [S135] but hosted conformance is reported as imperfect [S152], so the matrix lists **"strong constraint, always re-validate"** for hosted engines.
- **Done when:** at least two engines accept the grammar and generate parseable output in a smoke test.
- **Verify:** CI smoke (skipped with notice when engines absent) + manual run recorded.
- **Reference (lift/study, see `reference/README.md`):** `reference/verification/llguidance`, `reference/verification/xgrammar`

### T-061 · Constrained-decoding benchmark
`M` · Deps: T-059, T-060, T-063 · Implements: **NOV-03** · REQ: REQ-NOV-03b, REQ-NOV-03c
- **Do:** harness comparing constrained vs unconstrained generation per model: structural validity, catalog adherence, nesting errors, semantic-quality delta using the T-063 rubric; publish results in `evals/NOV-03.md`; **comparison deliverable:** grammar acceptance and size vs `Express.g4` [S114] on equivalent UIs; hosted-API conformance measured separately from local engines.
- **Done when:** report includes the **measured unconstrained baseline** and the delta with confidence notes; no claim beyond data.
- **Verify:** reproducible script; results reviewed.
- **Reference (lift/study, see `reference/README.md`):** `reference/verification/llguidance`, `reference/verification/xgrammar`

### T-062 · MCP server (core tools)
`L` · Deps: T-027, T-030, T-034, T-035, T-040, T-054 · Implements: **TLS-08** · REQ: REQ-TLS-08
- **Split:** (a) server scaffold + schemas; (b) parse/validate/lint/fmt/diff; (c) render/prompt/catalog.
- **Done when:** every tool has JSON-Schema input and structured output; verified with ≥ 2 MCP clients; `sync_apply` tool absent until T-081 and requires confirmation then.
- **Verify:** protocol tests; manual client runs recorded.
- **Reference (lift/study, see `reference/README.md`):** `reference/dsl/asciiwire`, `reference/protocols/json-render`, `reference/protocols/mcp-ui`

### T-063 · LLM eval harness and TESTING.md rewrite
`M` · Deps: T-054, T-055, T-028 · Implements: **QLT-02** · REQ: REQ-QLT-02
- **Do:** **tool-agnostic harness** — assertions are `mdui validate`/`lint` invocations; promptfoo [S109] is one runner (its repo states it is now OpenAI-owned [S136]), with an adapter boundary so another runner can replace it; ≥ 30 generation prompts, sync scenarios, injection prompts; **deterministic assertions via `mdui validate`/`lint`** first, rubric second; panel of ≥ 3 agents (owner picks); **record the v1 nesting-error baseline** (B-03 hypothesis) in `evals/BASELINE.md`; rewrite `TESTING.md` around the real suites (keep the manual checklists as release acceptance).
- **Done when:** CI fails below configured structural-validity threshold; baseline numbers published whatever they show.
- **Verify:** dry-run with recorded provider mocks; nightly workflow green.
- **Reference (lift/study, see `reference/README.md`):** `reference/protocols/a2ui`, `reference/verification/promptfoo`

> **Checkpoint 3 (β gate)** — PLAN §7.

---

## Phase 4 — Sync, verification and constraints (the novel features)
*Goal: close the loop — generate → verify → sync, with UX contracts. Slice delivered: GA candidate.*

### T-070 · Anchor model
`M` · Deps: T-019, T-022 · Implements: **NOV-01** · REQ: REQ-NOV-01a
- **Do:** sync-unit selection; explicit `{: #id }` anchors; lock-assigned anchors via tree matching (similarity threshold, deterministic tie-break); collision rules; `relink` primitive.
- **Done when:** anchors survive label edits, reordering and wrapper insertion on a mutation fixture set; collisions diagnosed.
- **Verify:** mutation fixtures; property: matching is deterministic.

### T-071 · Code extraction adapters (HTML, TSX)
`L` · Deps: T-070, T-052 · Implements: **NOV-01** · REQ: REQ-NOV-01a
- **Split:** (a) semantic-fingerprint model (labels, roles, order, actions); (b) HTML adapter; (c) TSX adapter.
- **Do:** read `// ui:anchor` comments and `data-mdui-anchor`; summarise code units; prefer rendered accessibility tree when a URL is supplied (shared with T-077).
- **Done when:** fingerprints stable under formatting/refactor-only changes on fixtures; unmapped nodes reported.
- **Verify:** fixture apps; stability property.

### T-072 · `.ui.lock` format
`S` · Deps: T-070 · Implements: **NOV-01** · REQ: REQ-NOV-01b
- **Do:** JSON schema, writer/reader, version field; refuse unknown versions; deterministic key order; contains anchor map, AST snapshot hash, code fingerprints, waivers section.
- **Done when:** lock diff is review-friendly; round-trips.
- **Verify:** schema tests.

### T-073 · Three-way classifier
`L` · Deps: T-071, T-072 · Implements: **NOV-01** · REQ: REQ-NOV-01a
- **Split:** (a) per-anchor comparison; (b) equivalence rules for `converged`; (c) conflict explanations.
- **Done when:** ≥ 95% correct class on ≥ 200 generated cases (mutations on spec, code, both); every anchor lands in exactly one class.
- **Verify:** generated fixture suite; confusion matrix recorded.

### T-074 · `mdui sync` (plan/apply/relink) with atomic apply
`L` · Deps: T-073, T-055 · Implements: **NOV-01** · REQ: REQ-NOV-01a, REQ-NOV-01b
- **Split:** (a) `plan` (read-only; human + JSON); (b) `apply` (atomic, journaled, rollback); (c) `relink`.
- **Do:** `apply` requires `--confirm`; writes confined to project root; re-extract after apply; update lock only if state equals intent.
- **Done when:** property test over ≥ 1,000 cases: apply then re-extract equals intended state, **zero data loss**; `apply` without `--confirm` refuses; path-escape attempts blocked.
- **Verify:** property + security tests.

### T-075 · Spec patcher and agent hand-off protocol
`M` · Deps: T-074, T-034 · Implements: **NOV-01** · REQ: REQ-NOV-01b
- **Do:** apply `code-ahead` changes to the `.ui.md` as minimal formatted edits; define the **plan JSON** an agent consumes to perform `spec-ahead` code edits, plus a post-edit check that reuses `plan` to confirm convergence.
- **Done when:** spec edits are minimal diffs; a scripted "agent" using only the plan JSON reaches `clean` on fixtures.
- **Verify:** fixture agent harness.

### T-076 · Oracle: AST → expected accessibility tree
`L` · Deps: T-019, T-022, T-032 · Implements: **NOV-02, LNG-03, LNG-05, LNG-13** · REQ: REQ-NOV-02a, REQ-NOV-02c, REQ-LNG-03, REQ-LNG-05, REQ-LNG-13
- **Split:** (a) role/name mapping table (documented); (b) state/viewport/theme expansion; (c) Playwright-compatible ARIA-snapshot YAML emitter — note Playwright's native matching is **order-sensitive** with partial matching by omission [S132], so emitted templates must be order-correct.
- **Done when:** mapping covers every primitive; one expected tree per state/environment; label-vs-placeholder fallback documented and configurable.
- **Verify:** golden expected trees.
- **Reference (lift/study, see `reference/README.md`):** `reference/verification/playwright`

### T-077 · Oracle runner, Fidelity Score and mutation benchmark
`L` · Deps: T-076, T-070 · Implements: **NOV-02** · REQ: REQ-NOV-02a, REQ-NOV-02b, REQ-NOV-02c
- **Split:** (a) Playwright driver (optional peer dep); (b) **own matcher** (subset/strict; supports order-insensitive regions, which Playwright's native comparison does not [S132]) + verdicts mapped to spec line/anchor; (c) weighted score + JSON/Markdown reports; (d) golden mutation set.
- **Do:** formula `Σ(w·matched)/Σ(w·expected)` with weights interactive 3 / heading 2 / landmark 2 / text 1 (configurable).
- **Done when:** on ≥ 10 apps × ≥ 20 seeded mutations: **recall ≥ 90%**, **false-positive ≤ 5%** on semantic-preserving refactors; ≤ 5 s per screen; score reproducible from a saved snapshot.
- **Verify:** benchmark suite; results in `evals/NOV-02.md`.
- **Reference (lift/study, see `reference/README.md`):** `reference/verification/axe-core`, `reference/verification/playwright`

### T-078 · Oracle CI mode, thresholds and baselines
`S` · Deps: T-077 · Implements: **NOV-02** · REQ: REQ-NOV-02b
- **Do:** `--min-fidelity`, baseline files, non-zero exit contract, pinned-Chromium guidance, `name-match: loose`.
- **Done when:** CI example fails on regression and passes on baseline.
- **Verify:** sample workflow.

### T-079 · Constraint schema, evaluator and rule catalogue
`L` · Deps: T-025, T-030, T-026, T-032 · Implements: **NOV-04, LNG-11** · REQ: REQ-NOV-04a, REQ-LNG-11
- **Split:** (a) schema + parsing (`constraints:`, `> constraint:`); (b) AST rules; (c) flow-graph rules; (d) heuristic mapping docs.
- **Do:** ≥ 12 rules (see FEATURE_ADDITIONS §5), each with severity default (`warn` except accessibility), named heuristic mapping [S108], threshold configuration.
- **Done when:** each rule has pass/fail fixtures; on ≥ 20 seeded-violation specs **recall ≥ 95%** with **0 false positives** on the clean set; docs state thresholds are configurable defaults, not universal truth.
- **Verify:** fixture suite; recall/FP table in `evals/NOV-04.md`.

### T-080 · Post-code constraint verification
`M` · Deps: T-079, T-077 · Implements: **NOV-04** · REQ: REQ-NOV-04a
- **Do:** verify measurable subset through the Oracle (tap-target via bounding boxes, labels, heading order, landmark presence); report alongside fidelity.
- **Done when:** ≥ 4 rules verified post-code; violations map to spec nodes.
- **Verify:** fixture apps with seeded violations.
- **Reference (lift/study, see `reference/README.md`):** `reference/verification/axe-core`, `reference/verification/playwright`

### T-081 · MCP sync and verify tools
`S` · Deps: T-062, T-074, T-077 · Implements: **TLS-08, NOV-01, NOV-02** · REQ: REQ-TLS-08
- **Do:** add `sync_plan`, `sync_apply` (confirmation parameter mandatory), `verify` tools.
- **Done when:** `sync_apply` without confirmation is refused by the server; tools documented.
- **Verify:** protocol tests.

### T-082 · Waivers and lock audit
`S` · Deps: T-079, T-072 · Implements: **NOV-04, NOV-01** · REQ: REQ-NOV-04b
- **Do:** `> waive: rule reason="…"`; waivers recorded (rule, reason, location, anchor) in `.ui.lock`; `mdui lint --audit-waivers`.
- **Done when:** waived diagnostics suppressed and listed; removal of a waiver re-surfaces the diagnostic.
- **Verify:** fixtures.

### T-083 · Conformance suite expansion and packaging
`M` · Deps: T-013, T-058, T-076, T-079 · Implements: **QLT-01** · REQ: REQ-QLT-01
- **Do:** grow to ≥ 250 fixtures covering v2; package as `@mdui/spec` conformance bundle + runner protocol; publish "claiming conformance" guide.
- **Done when:** the Python stub runner from T-013 passes the bundle; versioned alongside the grammar.
- **Verify:** third-language run.
- **Reference (lift/study, see `reference/README.md`):** `reference/protocols/a2ui`, `reference/tokens/dtcg`

> **Checkpoint 4 (GA candidate)** — PLAN §7: all four novel metrics met.

---

## Phase 5 — Interop, docs and GA release
*Goal: protocol exporters, embeddable rendering, honest token benchmark, docs site/playground, hardening and publication. Slice delivered: v2.0.0.*

### T-090 · A2UI exporter
`L` · Deps: T-019, T-050 · Implements: **AGT-05** · REQ: REQ-AGT-05
- **Split:** (a) node→A2UI component mapping table; (b) data model/binding mapping; (c) schema validation against the pinned upstream version.
- **Do:** `mdui export --to a2ui`; target the **A2UI v1.0 message set** (`createSurface`, `updateComponents`, `updateDataModel`, `deleteSurface`) with JSON-Pointer data bindings, **pinned to a spec commit** because the spec README still calls v1.0 "a candidate for becoming stable" [S112][S113]; document unmappable constructs and how they degrade.
- **Done when:** output validates against the pinned schema; unmappable constructs produce warnings, never silent drops.
- **Verify:** golden outputs; schema validation; upstream sample renders (manual).
- **Reference (lift/study, see `reference/README.md`):** `reference/dsl/openui`, `reference/protocols/a2ui`, `reference/protocols/genui`

### T-091 · json-render exporter
`M` · Deps: T-019, T-050 · Implements: **AGT-05** · REQ: REQ-AGT-05
- **Do:** emit a json-render spec + catalog definition [S38]; flat element map with stable IDs; document limitations.
- **Done when:** output validates against json-render's schema/Zod catalog for the supported subset.
- **Verify:** golden + validation.
- **Reference (lift/study, see `reference/README.md`):** `reference/protocols/json-render`

### T-092 · Docs site and in-browser playground
`L` · Deps: T-042, T-040, T-083 · Implements: **QLT-05** · REQ: REQ-QLT-05
- **Split:** (a) site scaffold + normative spec pages; (b) tutorials/guides (incl. NOV features); (c) playground using `@mdui/core` + renderer in the browser.
- **Done when:** playground parses/lints/previews with no server; every diagnostic code has a doc page; search works.
- **Verify:** build + link check + e2e smoke.

### T-094 · Embeddable fence, adapters and SVG renderer
`L` · Deps: T-040, T-042 · Implements: **TLS-13** · REQ: REQ-TLS-13
- **Split:** (a) SVG renderer (sketch/clean/wireframe) sharing the node→layout model; (b) ```` ```mdui ```` fence + `remark`/`markdown-it`/`rehype` adapters in `@mdui/embed`; (c) Obsidian adapter and GitHub-friendly output (generated `.svg` + Markdown image embeds).
- **Do:** self-contained SVG (no external fonts, real text not outlines, `<title>`/`<desc>`); fence info-string options (`mdui style=sketch state=loading`); zero-dependency `@mdui/core` retained (adapters isolated). Document what GitHub renders natively (Mermaid does [S140]; a custom fence needs generated SVG or the PR bot — **verify at build time**). Prior art: Wiremark adapters [S117], Wireloom SVG in GitHub [S116].
- **Done when:** a README with an `mdui` fence renders via remark and markdown-it; generated SVG displays in a GitHub-rendered README in a sandbox repo (evidence attached); SVG is within a size budget (proposed ≤ 50 kB for the login example).
- **Verify:** golden SVG; adapter tests; manual GitHub render check.
- **Reference (lift/study, see `reference/README.md`):** `reference/dsl/wiremark`, `reference/dsl/wireloom`, `reference/dsl/markdown-ui`, `reference/dsl/mdx`

### T-095 · Token benchmark and stats
`M` · Deps: T-016, T-021, T-090, T-091 · Implements: **TLS-12** · REQ: REQ-TLS-12
- **Do:** author ≥ 10 UI scenarios (the 7 examples + OpenUI-style contact-form scenarios [S115]) as mdui, A2UI v1.0 JSON, A2UI Express, json-render JSON and OpenUI Lang; count tokens with a **named tokenizer** (plus a second tokenizer family); `mdui stats`; publish methodology and raw counts in `evals/TOKENS.md`; **report every scenario, including those mdui loses**.
- **Done when:** the report is reproducible by script; a decision on a compact *profile* is recorded (RFC if yes) — driven by data, not assertion (P1 stays: human readability is not traded away).
- **Verify:** re-run determinism; an independent reviewer re-counts three scenarios.
- **Reference (lift/study, see `reference/README.md`):** `reference/dsl/openui`, `reference/protocols/a2ui`

### T-093 · GA hardening
`M` · Deps: T-074, T-077, T-079, T-090, T-091, T-094, T-095 · Implements: *(all — release quality)* · REQ: —
- **Do:** security review (path sandbox, URL schemes, injection fixtures), perf budgets met (T-044), a11y of preview/docs, docs completeness, **re-run novelty check and the source-verification pass** (FEATURE_ADDITIONS §8.5; COMPETITIVE_RESEARCH §2.4 — re-verify every `C`/`U` and star/version snapshot) and update COMPETITIVE_RESEARCH §8, final traceability pass.
- **Done when:** checklist in PLAN §7 (GA) all green; known limitations documented.
- **Verify:** checklist sign-off.

### T-098 · Release engineering — v2.0.0
`M` · Deps: T-093, T-092, T-053 · Implements: **QLT-05, AGT-01** · REQ: —
- **Do:** license decision (A3); npm publish with provenance; migration guide; announcement; registry listings (OpenClaw Hub, Agent Skills hubs) for the restructured skill; tag.
- **Done when:** installs verified from a clean machine for CLI, MCP and skill; changelog complete.
- **Verify:** clean-room install script.

> **Checkpoint 5 (GA)**.

---

## Phase 6 — 2.1 ecosystem
*Goal: reach and polish. Items are independent; order by demand.*

### T-100 · VS Code extension and language server
`L` · Deps: T-030, T-034, T-041 · Implements: **TLS-09** · REQ: REQ-TLS-09
- **Split:** (a) TextMate grammar; (b) LSP diagnostics/quick-fixes; (c) preview pane.
- **Done when:** diagnostics and quick-fixes live; preview updates on edit; published to the marketplace.
- **Verify:** extension tests; manual smoke.
- **Reference (lift/study, see `reference/README.md`):** `reference/dsl/wiremd`, `reference/dsl/asciiwire`

### T-101 · GitHub Action and PR wireframe diff
`M` · Deps: T-035, T-040, T-078 · Implements: **TLS-10** · REQ: REQ-TLS-10
- **Do:** Action running validate/lint/verify; single updating PR comment with wireframe diff (rendered images or inline HTML preview link) and summary.
- **Done when:** one comment per PR, updated on push; failure modes documented.
- **Verify:** sandbox repo run.

### T-102 · Figma importer
`L` · Deps: T-019, T-034 · Implements: **TLS-11** · REQ: REQ-TLS-11
- **Do:** import via the Figma MCP design context [S65]; lossy conversions annotated; never overwrite without `--force`.
- **Done when:** a sample file converts to a lint-clean `.ui.md` with annotations.
- **Verify:** recorded fixtures (no live Figma in CI).
- **Reference (lift/study, see `reference/README.md`):** `reference/dsl/wiremd`

### T-103 · HTML importer
`M` · Deps: T-019, T-034 · Implements: **TLS-11** · REQ: REQ-TLS-11
- **Do:** best-effort DOM→DSL using the role mapping from T-076 in reverse; annotate lossy parts.
- **Done when:** round-trip DSL→HTML→DSL preserves structure on the corpus.
- **Verify:** round-trip tests.

### T-104 · Adaptive Cards / Block Kit / Open-JSON-UI / A2UI-Express exporters
`L` · Deps: T-090 · Implements: **AGT-05** · REQ: REQ-AGT-05
- **Split:** one exporter per target (incl. **A2UI Express** text [S114]); validate against each target's schema/grammar [S43][S51][S37][S114].
- **Done when:** each validates; unsupported constructs warned.
- **Verify:** golden + schema validation.

### T-105 · Runtime generative-UI renderer (React)
`L` · Deps: T-042, T-050 · Implements: **AGT-06** · REQ: REQ-AGT-06
- **Do:** render a streamed DSL against a catalog with host-owned components; unknown nodes ignored + logged; no executable content.
- **Done when:** demo app streams a spec and renders only catalog components; security tests pass.
- **Verify:** component tests; security fixtures.
- **Reference (lift/study, see `reference/README.md`):** `reference/dsl/mdocui`, `reference/dsl/openui`, `reference/protocols/a2ui`, `reference/protocols/json-render`, `reference/protocols/ext-apps`, `reference/protocols/mcp-ui`, `reference/protocols/remote-dom`, `reference/protocols/ag-ui`, `reference/protocols/tambo`

### T-106 · Flutter oracle adapter
`L` · Deps: T-077 · Implements: **NOV-02** · REQ: REQ-NOV-02a
- **Do:** compile expected semantics for Flutter and verify via `SemanticsController` [S98][S99]; confirm the identifier mechanism for anchors.
- **Done when:** recall/FP metrics replicated on a Flutter golden set.
- **Verify:** Flutter test run in CI.
- **Reference (lift/study, see `reference/README.md`):** `reference/protocols/genui`

### T-107 · i18n / RTL
`M` · Deps: T-040, T-022 · Implements: **LNG-12** · REQ: REQ-LNG-12
- **Do:** `lang`/`dir`, `t("key")` with keys file, RTL mirroring in renderer, direction-sensitive lint.
- **Done when:** RTL preview mirrors; missing keys diagnosed.
- **Verify:** golden renders.

### T-108 · Dart and Razor sync adapters
`L` · Deps: T-073 · Implements: **NOV-01** · REQ: REQ-NOV-01a
- **Do:** extraction adapters for Flutter (Dart) and Blazor (Razor).
- **Done when:** classification accuracy ≥ 95% on per-adapter fixture sets.
- **Verify:** fixtures.

### T-111 · Flow-diagram rendering with embedded screens
`M` · Deps: T-025, T-094 · Implements: **TLS-13** · REQ: REQ-TLS-13
- **Do:** render a `.flow.md` as an SVG diagram whose nodes embed screen previews and whose edges carry action labels and `when:` guards (Salt embeds screens in activity diagrams, including `while`/`repeat` conditions [S12]; Wiremark links named frames [S117]).
- **Done when:** the sample flow renders with correct edges and `terminal` markers; layout is deterministic; the SVG has a text alternative (title/desc + transition list).
- **Verify:** golden SVG.
- **Reference (lift/study, see `reference/README.md`):** `reference/dsl/wiremark`

### T-110 · Release engineering — v2.1
`S` · Deps: T-098, T-100, T-101, T-104, T-105, T-106, T-107, T-108, T-111 · Implements: *(release)* · REQ: —
- **Do:** ship what's done (items may slip without blocking others); changelog; docs.
- **Done when:** published; deferred items re-queued via RFC.
- **Verify:** clean-room install.

---

## Appendix A — Feature → task index

| Feature | Tasks |
|---|---|
| LNG-01 | T-010, T-015, T-016, T-058 |
| LNG-02 | T-012, T-020 |
| LNG-03 | T-012, T-020, T-040, T-076 |
| LNG-04 | T-012, T-021 |
| LNG-05 | T-012, T-022, T-040, T-041, T-076 |
| LNG-06 | T-012, T-022 |
| LNG-07 | T-012, T-023 |
| LNG-08 | T-012, T-025 |
| LNG-09 | T-011, T-016 |
| LNG-10 | T-012, T-017, T-024, T-036 |
| LNG-11 | T-012, T-026, T-079 |
| LNG-12 | T-107 |
| LNG-13 | T-012, T-018, T-040, T-041, T-076 |
| TLS-01 | T-014, T-015, T-019, T-027 |
| TLS-02 | T-027 |
| TLS-03 | T-028, T-030, T-031 |
| TLS-04 | T-034 |
| TLS-05 | T-035, T-039 |
| TLS-06 | T-040, T-041 |
| TLS-07 | T-042 |
| TLS-08 | T-062, T-081 |
| TLS-09 | T-100 |
| TLS-10 | T-101 |
| TLS-11 | T-102, T-103 |
| TLS-13 | T-094, T-111 |
| TLS-12 | T-095 |
| DSY-01 | T-037 |
| DSY-02 | T-038 |
| DSY-03 | T-039 |
| DSY-04 | T-050, T-051 |
| DSY-05 | T-057 |
| DSY-06 | T-052, T-054 |
| AGT-01 | T-004, T-053, T-098 |
| AGT-02 | T-054 |
| AGT-03 | T-056 |
| AGT-04 | T-055 |
| AGT-05 | T-090, T-091, T-104 |
| AGT-06 | T-105 |
| QLT-01 | T-013, T-083 |
| QLT-02 | T-063 |
| QLT-03 | T-032 |
| QLT-04 | T-001, T-003 |
| QLT-05 | T-004, T-092, T-098 |
| NOV-01 | T-070 – T-075, T-081, T-082, T-108 |
| NOV-02 | T-076 – T-078, T-081, T-106 |
| NOV-03 | T-058 – T-061 |
| NOV-04 | T-079 – T-082 |
