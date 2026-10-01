# Graph Report - markdown-ui-dsl  (2026-10-01)

## Corpus Check
- 186 files · ~126,448 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 6, .ebnf 2)

## Summary
- 1872 nodes · 2954 edges · 140 communities (119 shown, 21 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f93351d3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- skills.py
- Phase 2 — Tooling and design system
- Development Specification — Markdown-UI DSL v2 Program
- reference.sh
- Implementation Plan — Markdown-UI DSL v2 Program
- Competitive Research Catalogue — Markdown-UI DSL
- lint
- Markdown UI DSL for AI Agents
- Phase 1 — Language core
- 📱 Responsive Design
- README.md
- Phase 3 — Agent integration, evals and the grammar pack
- Agent skills — index, routing and vetting
- parse.ts
- Blazor + Bootstrap 5 Design System
- Flutter Material Design System
- properties
- 🧪 Simulation Testing Strategy
- Jane Doe
- mobile-app-layout.ui.md
- action-tracker-detail.ui.md
- action-tracker-master.ui.md
- chat-interface.ui.md
- login-form.ui.md
- Phase 4 — Sync, verification and constraints (the novel features)
- graph.sh
- CLAUDE.md
- package.json
- compilerOptions
- traceability.ts
- core/package.json
- spec/package.json
- config.json
- test/tsconfig.json
- ADR-001 — Parser strategy
- ADR-002 — Stack and pinned versions
- ADR-003 — Package boundaries and the dependency rule
- ADR-004 — Frontmatter: bundled strict YAML subset
- .prettierrc.json
- Changelog
- .changeset/README.md
- packages_core_dist_index
- core/tsconfig.json
- spec/tsconfig.json
- spec/src/index.ts
- ADR-005 — DSL 1.0.x ambiguity and escaping decisions (T-011, LNG-09)
- catalog/test/catalog.test.ts
- render.ts
- engine.ts
- analyze.ts
- core/src/index.ts
- attrs
- stream.ts
- inline.ts
- analysis.ts
- ast.schema.json
- args
- catalog.ts
- main.ts
- cli/package.json
- span
- type
- Pos
- $defs
- export.ts
- frontmatter.ts
- diff.ts
- a11y.ts
- lint/package.json
- kind
- properties
- run.mjs
- format.ts
- semantic.ts
- RFC 0001 — DSL 2.0 syntax
- catalog/package.json
- tokens.ts
- export.test.ts
- tokens/src/model.ts
- tools/package.json
- scripts
- render/package.json
- properties
- tokens/package.json
- color.ts
- devDependencies
- Attrs
- cli/src/index.ts
- Phase 6 — 2.1 ecosystem
- cli.test.ts
- inline.test.ts
- InlineBinding
- InlineCode
- gen-ast-schema.mjs
- compat.test.ts
- properties
- RFC NNNN — Title
- conformance.test.ts
- AGENTS.md — markdown-ui-dsl
- Phase 5 — Interop, docs and GA release
- Build something great.
- SKILL.md
- Contributing
- gen-lint-docs.mjs
- format.test.ts
- e2e/tsconfig.json
- InlineImage
- InlineInput
- InlineLink
- InlineToggle
- Installation & Setup
- SP-4 — Token-cost baseline (mdui vs A2UI v1.0 JSON)
- eslint.config.js
- catalog/test/tsconfig.json
- main
- cli/test/tsconfig.json
- cli/tsconfig.json
- schema.test.ts
- lint/test/tsconfig.json
- render/test/tsconfig.json
- Tabs
- tokens/test/tsconfig.json
- tools/test/tsconfig.json
- vitest
- Lint rules and diagnostic codes
- Task Breakdown — Markdown-UI DSL v2 Program
- catalog/tsconfig.json
- ref_node_fs
- lint/tsconfig.json
- render/tsconfig.json
- tokens/tsconfig.json
- tools/tsconfig.json
- 00_simple-login-form.ui.md
- messy.in.md
- messy.out.md

## God Nodes (most connected - your core abstractions)
1. `$defs` - 35 edges
2. `vitest` - 32 edges
3. `kind` - 30 edges
4. `parse()` - 23 edges
5. `lint()` - 22 edges
6. `Phase 1 — Language core` - 21 edges
7. `compilerOptions` - 19 edges
8. `parseWith()` - 18 edges
9. `dict()` - 17 edges
10. `Base` - 16 edges

## Surprising Connections (you probably didn't know these)
- `1. Executive summary` --references--> `lint()`  [INFERRED]
  docs/COMPETITIVE_RESEARCH.md → packages/lint/src/engine.ts
- `4.3 Design-system and design-token formats for agents` --references--> `lint()`  [INFERRED]
  docs/COMPETITIVE_RESEARCH.md → packages/lint/src/engine.ts
- `6. Testing strategy` --references--> `lint()`  [INFERRED]
  docs/SPEC.md → packages/lint/src/engine.ts
- `T-003 · Continuous integration` --references--> `lint()`  [INFERRED]
  docs/TASKS.md → packages/lint/src/engine.ts
- `4. Project structure` --references--> `render()`  [INFERRED]
  docs/SPEC.md → packages/render/src/render.ts

## Import Cycles
- None detected.

## Communities (140 total, 21 thin omitted)

### Community 0 - "skills.py"
Cohesion: 0.07
Nodes (21): Conformance corpus, Fixture, Outline, Runner protocol, Construct → production, Decisions and ambiguities handed to T-011, DSL 1.0.3 — grammar notes, declared() (+13 more)

### Community 1 - "Phase 2 — Tooling and design system"
Cohesion: 0.14
Nodes (14): Phase 2 — Tooling and design system, T-030 · Lint engine completion, T-031 · Semantic and flow lint rules, T-032 · Accessibility semantics and rules, T-034 · Canonical formatter, T-035 · Semantic diff, T-036 · Migrate tool, T-037 · Design-system loader (DESIGN.md + legacy) (+6 more)

### Community 2 - "Development Specification — Markdown-UI DSL v2 Program"
Cohesion: 0.04
Nodes (46): 10. Change log (rev. 2), 1. Design principles (non-negotiable constraints on every feature), 2. Priority and release key, 4. Feature dependency overview, 5. Novel / breakthrough features, 6. How the novel features compound, 7. Explicit non-goals (locked out of scope), 8. Change control (+38 more)

### Community 3 - "reference.sh"
Cohesion: 0.60
Nodes (5): detect_license(), die(), group_paths(), repo_of(), reference.sh script

### Community 4 - "Implementation Plan — Markdown-UI DSL v2 Program"
Cohesion: 0.07
Nodes (27): 10. Communication and migration plan, 11. Definition of ready (per task, before starting), 12. Immediate next actions, 13. Competitive-intelligence cadence, 14.1 Paths by group, 14.2 Consult-first paths by phase / task, 14.3 Highest-leverage lifts (where reference code removes the most work), 14.4 Not vendored (and where to look instead) (+19 more)

### Community 5 - "Competitive Research Catalogue — Markdown-UI DSL"
Cohesion: 0.09
Nodes (23): 1. Executive summary, 2.1 Approach, 2.2 Source quality tiers, 2.3 Limitations and how to read novelty claims, 2.4 Verification pass (rev. 2, same day), 2. Method, 3.1 Capabilities (what exists), 3.2 Defects and risks found in the repository itself (+15 more)

### Community 6 - "lint"
Cohesion: 0.09
Nodes (22): 3.1 Language (LNG), 3.3 Design system & tokens (DSY), 3.4 Agent integration (AGT), 3.5 Quality & governance (QLT), 3. Feature register, T-063 · LLM eval harness and TESTING.md rewrite, ALL_RULES, dedupe() (+14 more)

### Community 7 - "Markdown UI DSL for AI Agents"
Cohesion: 0.13
Nodes (15): Components, Contributing, Design Theming, Events & Interactivity, Layouts, License, Markdown UI DSL for AI Agents, Recommended Project Structure (+7 more)

### Community 8 - "Phase 1 — Language core"
Cohesion: 0.10
Nodes (20): Phase 1 — Language core, T-006 · Reference-library hygiene and CI guards, T-010 · Normative grammar for v1.0.3, T-011 · Ambiguity and escaping decisions, T-012 · RFC-0001 — DSL 2.0 syntax, T-013 · Conformance corpus v1 and protocol, T-015 · Block parser, T-016 · Inline parser (v1 components) (+12 more)

### Community 9 - "📱 Responsive Design"
Cohesion: 0.12
Nodes (16): Advanced UI Elements, Breakpoints, Chat Interfaces (Gemini / Minimal AI Style), Colors, 🧩 Component Mappings, 🎨 Design Tokens, 📐 General Rule of Thumb, Generation Rule (+8 more)

### Community 11 - "Phase 3 — Agent integration, evals and the grammar pack"
Cohesion: 0.14
Nodes (14): Phase 3 — Agent integration, evals and the grammar pack, T-050 · Component catalog schema and loader, T-051 · Catalog lint rules, T-052 · Component map, T-053 · Agent Skills restructure, T-054 · Prompt generator, T-055 · Safety hardening, T-056 · SDD interoperability (+6 more)

### Community 12 - "Agent skills — index, routing and vetting"
Cohesion: 0.15
Nodes (13): 1. Routing table — which skill for which work, 2. Project-local skills (32), 3.1 Vendored into the project (6), 3.2 Relevant but **not** vendored, 3.3 Proprietary — present but not redistributable, 3.4 Not relevant to this project, 3. Index of installed skills (authoring-environment snapshot, 110 skills), 4. How the 25 new skills were found (+5 more)

### Community 13 - "parse.ts"
Cohesion: 0.09
Nodes (40): Base, CodeNode, CommentNode, ContainerKind, ContainerNode, DirectiveNode, DividerNode, HeadingNode (+32 more)

### Community 14 - "Blazor + Bootstrap 5 Design System"
Cohesion: 0.14
Nodes (13): Blazor + Bootstrap 5 Design System, Breakpoints (Bootstrap 5), Colors & Utility Classes, 🧩 Component Mappings, 🎨 Design Tokens, 📐 General Rule of Thumb, Generation Rule, Interactive Elements (+5 more)

### Community 15 - "Flutter Material Design System"
Cohesion: 0.14
Nodes (13): Breakpoints (logical pixels via `LayoutBuilder`), Colors, 🧩 Component Mappings, 🎨 Design Tokens, Flutter Material Design System, 📐 General Rule of Thumb, Generation Rule, Interactive Elements (+5 more)

### Community 16 - "properties"
Cohesion: 0.08
Nodes (29): items, type, additionalProperties, properties, required, type, $id, pattern (+21 more)

### Community 17 - "🧪 Simulation Testing Strategy"
Cohesion: 0.29
Nodes (6): 1. Test: Translation & Theming Adherence, 2. Test: Two-Way Binding (Code -> Spec), 3. Test: Natural Language Directives, Future: Automated LLM Evals, 🧪 Simulation Testing Strategy, Testing Markdown-UI DSL

### Community 18 - "Jane Doe"
Cohesion: 0.40
Nodes (4): Account Details, Jane Doe, Preferences, Recent Activity

### Community 19 - "mobile-app-layout.ui.md"
Cohesion: 0.50
Nodes (3): Daily Goal, My Dashboard, Recent Transactions

### Community 26 - "Phase 4 — Sync, verification and constraints (the novel features)"
Cohesion: 0.13
Nodes (15): Phase 4 — Sync, verification and constraints (the novel features), T-070 · Anchor model, T-071 · Code extraction adapters (HTML, TSX), T-072 · `.ui.lock` format, T-073 · Three-way classifier, T-074 · `mdui sync` (plan/apply/relink) with atomic apply, T-075 · Spec patcher and agent hand-off protocol, T-076 · Oracle: AST → expected accessibility tree (+7 more)

### Community 29 - "package.json"
Cohesion: 0.13
Nodes (14): engines, node, name, packageManager, private, type, version, axe-core (+6 more)

### Community 30 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, declaration, exactOptionalPropertyTypes, ignoreDeprecations, isolatedModules, lib, module, moduleResolution (+11 more)

### Community 31 - "traceability.ts"
Cohesion: 0.27
Nodes (4): r, checkTraceability(), Report, taskBlocks()

### Community 32 - "core/package.json"
Cohesion: 0.13
Nodes (14): dependencies, @mdui/spec, description, exports, files, license, name, scripts (+6 more)

### Community 33 - "spec/package.json"
Cohesion: 0.17
Nodes (11): description, exports, files, license, name, scripts, build, typecheck (+3 more)

### Community 34 - "config.json"
Cohesion: 0.25
Nodes (7): access, baseBranch, changelog, commit, ignore, $schema, updateInternalDependencies

### Community 35 - "test/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, types, extends, include, ../../../tsconfig.base.json

### Community 36 - "ADR-001 — Parser strategy"
Cohesion: 0.40
Nodes (4): ADR-001 — Parser strategy, Decision, Rejected, Why

### Community 37 - "ADR-002 — Stack and pinned versions"
Cohesion: 0.50
Nodes (3): ADR-002 — Stack and pinned versions, Consequences, Decision

### Community 38 - "ADR-003 — Package boundaries and the dependency rule"
Cohesion: 0.50
Nodes (3): ADR-003 — Package boundaries and the dependency rule, Consequences, Decision

### Community 39 - "ADR-004 — Frontmatter: bundled strict YAML subset"
Cohesion: 0.33
Nodes (5): Addendum (T-017), Addendum (T-037) — design systems use full YAML, safely, ADR-004 — Frontmatter: bundled strict YAML subset, Decision, Why

### Community 40 - ".prettierrc.json"
Cohesion: 0.50
Nodes (3): printWidth, singleQuote, trailingComma

### Community 43 - "packages_core_dist_index"
Cohesion: 0.12
Nodes (13): 3.2 Tooling (TLS), DiffOp, DiffResult, formatDiff(), literalLines(), MEANING_CHANGES, migrate(), MigrateChange (+5 more)

### Community 44 - "core/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 45 - "spec/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 47 - "ADR-005 — DSL 1.0.x ambiguity and escaping decisions (T-011, LNG-09)"
Cohesion: 0.50
Nodes (3): Addendum (T-016) — emphasis, Addendum (T-030) — user text as object keys, ADR-005 — DSL 1.0.x ambiguity and escaping decisions (T-011, LNG-09)

### Community 48 - "catalog/test/catalog.test.ts"
Cohesion: 0.05
Nodes (35): Progress, T-001 · Fix example and documentation defects, T-002 · Monorepo scaffold and architecture decision records, T-003 · Continuous integration, T-004 · Governance and contributor docs, T-005 · Traceability checker, CatalogIssue, loadCatalog() (+27 more)

### Community 49 - "render.ts"
Cohesion: 0.09
Nodes (32): { encode: cl100k }, { encode: o200k }, require, rows, sm, su, axePath, examples (+24 more)

### Community 50 - "engine.ts"
Cohesion: 0.11
Nodes (23): better(), DesignSystemLint, fixSource(), LintResult, measure(), Suppression, suppressions(), applyFixes() (+15 more)

### Community 51 - "analyze.ts"
Cohesion: 0.15
Nodes (33): add(), analyze(), checkBinding(), collectActions(), flowChecks(), includeUse(), inlineChecks(), keySpan() (+25 more)

### Community 52 - "core/src/index.ts"
Cohesion: 0.10
Nodes (25): T-014 · Diagnostics model and code registry, ActionDef, ActionRegistry, AnalyzeOptions, AnalyzeResult, CodeInfo, CODES, DiagnosticCode (+17 more)

### Community 53 - "attrs"
Cohesion: 0.07
Nodes (33): type, $ref, type, Divider, InlineBadge, InlineButton, InlineCheckbox, InlineRadio (+25 more)

### Community 54 - "stream.ts"
Cohesion: 0.13
Nodes (18): Ctx, ResolvedInclude, BlockNode, Document, FrontmatterNode, Diagnostic, isOpen(), parseStream() (+10 more)

### Community 55 - "inline.ts"
Cohesion: 0.10
Nodes (29): ADR-0005, AttrIssue, ENUMS, parseAttrs(), RESERVED_FLAGS, RESERVED_KEYS, RESERVED_NUMBERS, RESERVED_STRINGS (+21 more)

### Community 56 - "analysis.ts"
Cohesion: 0.12
Nodes (20): checkBreakpoints(), checkContrast(), checkOrphans(), checkPrimary(), checkRefs(), colorOf(), ContrastPair, contrastPairs() (+12 more)

### Community 57 - "ast.schema.json"
Cohesion: 0.07
Nodes (27): additionalProperties, items, type, items, description, items, type, enum (+19 more)

### Community 58 - "args"
Cohesion: 0.08
Nodes (27): additionalProperties, properties, required, type, InlineComponent, InlineWidget, additionalProperties, properties (+19 more)

### Community 59 - "catalog.ts"
Cohesion: 0.09
Nodes (12): catalogRules, componentProps, CONTAINER_NAME, INLINE_BUILTIN, thirdPartyComponent, unknownComponent, Use, uses() (+4 more)

### Community 60 - "main.ts"
Cohesion: 0.10
Nodes (10): COMMANDS, failsOn(), FileReport, listRules(), RANK, readSource(), report(), run() (+2 more)

### Community 61 - "cli/package.json"
Cohesion: 0.08
Nodes (23): bin, mdui, dependencies, @mdui/core, @mdui/lint, @mdui/render, @mdui/tokens, @mdui/tools (+15 more)

### Community 62 - "span"
Cohesion: 0.10
Nodes (24): properties, additionalProperties, properties, required, type, Comment, Line, properties (+16 more)

### Community 63 - "type"
Cohesion: 0.12
Nodes (23): enum, Directive, additionalProperties, properties, required, type, items, type (+15 more)

### Community 64 - "Pos"
Cohesion: 0.08
Nodes (23): minimum, type, Pos, Span, $ref, minimum, type, minimum (+15 more)

### Community 65 - "$defs"
Cohesion: 0.10
Nodes (21): oneOf, additionalProperties, required, type, $defs, Block, Container, Heading (+13 more)

### Community 66 - "export.ts"
Cohesion: 0.19
Nodes (20): toHex(), Dim, DTCG_TYPES, dtcgColor(), dtcgDim(), DtcgNode, ExportReport, family() (+12 more)

### Community 67 - "frontmatter.ts"
Cohesion: 0.16
Nodes (18): ADR-0004, Ctx, dslVersion(), findLine(), flow(), FrontmatterData, FrontmatterIssue, FrontmatterResult (+10 more)

### Community 68 - "diff.ts"
Cohesion: 0.17
Nodes (17): `diff --json`, `--json` output (version 1), @mdui/cli, attrSig(), blockItem(), count(), Ctx, diffDocuments() (+9 more)

### Community 69 - "a11y.ts"
Cohesion: 0.10
Nodes (19): a11yRules, buttonText, documentLanguage, duplicateLandmark, emptyHeading, GENERIC_ALT, GENERIC_LINK, headingOrder (+11 more)

### Community 70 - "lint/package.json"
Cohesion: 0.11
Nodes (18): dependencies, @mdui/catalog, @mdui/core, @mdui/tokens, description, exports, files, @mdui/core (+10 more)

### Community 71 - "kind"
Cohesion: 0.13
Nodes (19): type, type, properties, InlineEm, InlineStrong, additionalProperties, properties, required (+11 more)

### Community 72 - "properties"
Cohesion: 0.11
Nodes (19): additionalProperties, pattern, required, type, Code, Diagnostic, additionalProperties, properties (+11 more)

### Community 73 - "run.mjs"
Cohesion: 0.11
Nodes (7): BUDGETS_MS, dir, examples, machine, results, src, stream

### Community 74 - "format.ts"
Cohesion: 0.21
Nodes (16): printAttrs(), canonicalInline(), equivalent(), format(), FormatResult, formatTable(), hasRich(), indentOf() (+8 more)

### Community 75 - "semantic.ts"
Cohesion: 0.11
Nodes (16): dataFile, destructiveWithoutConfirm, flowDeadEnd, flowReferences, flowUnreachableScreen, frontmatterValid, includeCycle, invalidAttribute (+8 more)

### Community 76 - "RFC 0001 — DSL 2.0 syntax"
Cohesion: 0.12
Nodes (16): 10. Security, 11. Unresolved questions, 1. Summary, 2. Motivation, 3. Syntax and semantics, 3a. Closers, attributes, field attributes (LNG-02, LNG-03), 3b. New primitives (LNG-04), 3c. Regions, states, data, includes (LNG-05, LNG-06, LNG-07) (+8 more)

### Community 77 - "catalog/package.json"
Cohesion: 0.12
Nodes (16): dependencies, @mdui/core, yaml, description, exports, files, @mdui/core, yaml (+8 more)

### Community 78 - "tokens.ts"
Cohesion: 0.15
Nodes (8): Finding, brokenRef, contrastRatio, ds(), missingPrimary, orphanedToken, tokenRules, unknownBreakpoint

### Community 80 - "tokens/src/model.ts"
Cohesion: 0.14
Nodes (16): DsCode, DsDiagnostic, GROUPS, lineMap(), loadDesignSystem(), MduiExtension, Resolved, sections() (+8 more)

### Community 81 - "tools/package.json"
Cohesion: 0.12
Nodes (16): dependencies, @mdui/core, @mdui/lint, description, exports, files, @mdui/core, @mdui/lint (+8 more)

### Community 82 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, bench, build, changeset, check, format, format:check, lint (+7 more)

### Community 83 - "render/package.json"
Cohesion: 0.13
Nodes (14): dependencies, @mdui/core, description, exports, files, @mdui/core, license, name (+6 more)

### Community 84 - "properties"
Cohesion: 0.13
Nodes (15): items, type, Table, items, type, items, type, enum (+7 more)

### Community 85 - "tokens/package.json"
Cohesion: 0.13
Nodes (14): dependencies, yaml, description, exports, files, yaml, license, name (+6 more)

### Community 86 - "color.ts"
Cohesion: 0.25
Nodes (12): clamp(), contrastRatio(), hex(), hslToRgb(), luminance(), NAMED, parseColor(), parts() (+4 more)

### Community 87 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, ajv, axe-core, @changesets/cli, eslint, @eslint/js, fast-check, playwright-core (+6 more)

### Community 88 - "Attrs"
Cohesion: 0.14
Nodes (14): anyOf, additionalProperties, properties, required, type, items, type, Attrs (+6 more)

### Community 89 - "cli/src/index.ts"
Cohesion: 0.28
Nodes (8): io, Config, ConfigError, FailOn, KEYS, loadConfig(), Io, VERSION

### Community 90 - "Phase 6 — 2.1 ecosystem"
Cohesion: 0.17
Nodes (12): Phase 6 — 2.1 ecosystem, T-100 · VS Code extension and language server, T-101 · GitHub Action and PR wireframe diff, T-102 · Figma importer, T-103 · HTML importer, T-104 · Adaptive Cards / Block Kit / Open-JSON-UI / A2UI-Express exporters, T-105 · Runtime generative-UI renderer (React), T-106 · Flutter oracle adapter (+4 more)

### Community 91 - "cli.test.ts"
Cohesion: 0.23
Nodes (7): expand(), globToRegExp(), isGlob(), SKIP_DIRS, walk(), EXIT, DS()

### Community 92 - "inline.test.ts"
Cohesion: 0.18
Nodes (9): node(), outline(), lines, TOKENS, Fixture, fixtures, PIECES, soup (+1 more)

### Community 93 - "InlineBinding"
Cohesion: 0.17
Nodes (12): InlineBinding, InlineUse, additionalProperties, properties, required, type, additionalProperties, properties (+4 more)

### Community 94 - "InlineCode"
Cohesion: 0.17
Nodes (12): InlineCode, InlineText, additionalProperties, properties, required, type, additionalProperties, properties (+4 more)

### Community 95 - "gen-ast-schema.mjs"
Cohesion: 0.17
Nodes (7): defs, file, int1, schema, span, str, withAttrs

### Community 96 - "compat.test.ts"
Cohesion: 0.18
Nodes (9): BROKEN_FRONTMATTER, CHANGES_MEANING, dir, examples, Fixture, fixtures, shared, strip() (+1 more)

### Community 97 - "properties"
Cohesion: 0.20
Nodes (10): InlineDropdown, type, additionalProperties, properties, required, type, items, type (+2 more)

### Community 98 - "RFC NNNN — Title"
Cohesion: 0.22
Nodes (8): Alternatives considered, Compatibility, Motivation, RFC NNNN — Title, Security, Summary, Syntax and semantics, Unresolved questions

### Community 99 - "conformance.test.ts"
Cohesion: 0.22
Nodes (7): dir, Fixture, invalid, invalid2, schema, valid, valid2

### Community 100 - "AGENTS.md — markdown-ui-dsl"
Cohesion: 0.25
Nodes (7): AGENTS.md — markdown-ui-dsl, Checks before you finish, Code map (graphify), Commands, Read first, Skills, Working agreements

### Community 101 - "Phase 5 — Interop, docs and GA release"
Cohesion: 0.25
Nodes (8): Phase 5 — Interop, docs and GA release, T-090 · A2UI exporter, T-091 · json-render exporter, T-092 · Docs site and in-browser playground, T-093 · GA hardening, T-094 · Embeddable fence, adapters and SVG renderer, T-095 · Token benchmark and stats, T-098 · Release engineering — v2.0.0

### Community 102 - "Build something great."
Cohesion: 0.25
Nodes (7): Build something great., Hero Section, Page Header, Product Cards, Responsive Layout Example, Side-by-Side Content Block, Why Responsive DSL?

### Community 103 - "SKILL.md"
Cohesion: 0.25
Nodes (7): Row, Components, Frontmatter & Theming (Optional), Instructions, Layouts, Markdown-UI DSL Schema, Role

### Community 104 - "Contributing"
Cohesion: 0.29
Nodes (7): Agent contributors, Changing the language: RFCs, Contributing, How work flows, Quick start, Reference library and lifting code, Versioning

### Community 105 - "gen-lint-docs.mjs"
Cohesion: 0.29
Nodes (3): codeRows, file, rows

### Community 106 - "format.test.ts"
Cohesion: 0.29
Nodes (6): conf, corpus, docs, Fixture, golden, TOKENS

### Community 107 - "e2e/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, lib, types, extends, include, ../../../tsconfig.base.json

### Community 108 - "InlineImage"
Cohesion: 0.29
Nodes (7): InlineImage, type, additionalProperties, properties, required, type, description

### Community 109 - "InlineInput"
Cohesion: 0.29
Nodes (7): InlineInput, additionalProperties, properties, required, type, type, placeholder

### Community 110 - "InlineLink"
Cohesion: 0.29
Nodes (7): InlineLink, additionalProperties, properties, required, type, target, type

### Community 111 - "InlineToggle"
Cohesion: 0.29
Nodes (7): InlineToggle, additionalProperties, properties, required, type, type, on

### Community 112 - "Installation & Setup"
Cohesion: 0.29
Nodes (7): 1. OpenClaw Hub (Recommended), 2. GitHub Copilot (Agent Mode), 3. Cursor / Roo Code / Cline, 4. Claude Code, 5. Gemini CLI, 6. GPT Codex (and other CLI agents), Installation & Setup

### Community 113 - "SP-4 — Token-cost baseline (mdui vs A2UI v1.0 JSON)"
Cohesion: 0.33
Nodes (5): Decisions fed to RFC-0001, Method, Result (o200k_base), SP-4 — Token-cost baseline (mdui vs A2UI v1.0 JSON), What this does and does not show

### Community 114 - "eslint.config.js"
Cohesion: 0.33
Nodes (4): ADR-0003, NODE_BUILTINS, @eslint/js, typescript-eslint

### Community 115 - "catalog/test/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, types, extends, include, ../../../tsconfig.base.json

### Community 116 - "main"
Cohesion: 0.47
Nodes (5): Args, parseArgs(), UsageError, VALUE_FLAGS, main()

### Community 117 - "cli/test/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, types, extends, include, ../../../tsconfig.base.json

### Community 118 - "cli/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, types, extends, include, ../../tsconfig.base.json

### Community 119 - "schema.test.ts"
Cohesion: 0.33
Nodes (5): fixtureFiles, inputs, schema, validate, ajv

### Community 120 - "lint/test/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, types, extends, include, ../../../tsconfig.base.json

### Community 121 - "render/test/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, types, extends, include, ../../../tsconfig.base.json

### Community 122 - "Tabs"
Cohesion: 0.40
Nodes (6): Tabs, tabs, additionalProperties, properties, required, type

### Community 123 - "tokens/test/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, types, extends, include, ../../../tsconfig.base.json

### Community 124 - "tools/test/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, types, extends, include, ../../../tsconfig.base.json

### Community 126 - "Lint rules and diagnostic codes"
Cohesion: 0.50
Nodes (3): Diagnostic code registry, Lint rules and diagnostic codes, WCAG mapping — status

### Community 127 - "Task Breakdown — Markdown-UI DSL v2 Program"
Cohesion: 0.50
Nodes (4): Appendix A — Feature → task index, Conventions, Phase 0 — Foundations & hygiene, Task Breakdown — Markdown-UI DSL v2 Program

### Community 128 - "catalog/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 130 - "lint/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 131 - "render/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 132 - "tokens/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 133 - "tools/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

## Knowledge Gaps
- **917 isolated node(s):** `$schema`, `changelog`, `commit`, `access`, `baseBranch` (+912 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1064 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `ref_node_fs`, `lint`, `parse.ts`, `package.json`, `traceability.ts`, `packages_core_dist_index`, `catalog/test/catalog.test.ts`, `render.ts`, `analyze.ts`, `core/src/index.ts`, `stream.ts`, `analysis.ts`, `frontmatter.ts`, `format.ts`, `export.test.ts`, `color.ts`, `cli.test.ts`, `inline.test.ts`, `compat.test.ts`, `conformance.test.ts`, `format.test.ts`, `schema.test.ts`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `Progress` connect `catalog/test/catalog.test.ts` to `diff.ts`, `format.ts`, `packages_core_dist_index`, `tokens/src/model.ts`, `engine.ts`, `stream.ts`, `Task Breakdown — Markdown-UI DSL v2 Program`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `Task Breakdown — Markdown-UI DSL v2 Program` connect `Task Breakdown — Markdown-UI DSL v2 Program` to `Phase 2 — Tooling and design system`, `Phase 5 — Interop, docs and GA release`, `Phase 6 — 2.1 ecosystem`, `Phase 1 — Language core`, `README.md`, `Phase 3 — Agent integration, evals and the grammar pack`, `catalog/test/catalog.test.ts`, `Phase 4 — Sync, verification and constraints (the novel features)`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **What connects `$schema`, `changelog`, `commit` to the rest of the system?**
  _917 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `skills.py` be split into smaller, more focused modules?**
  _Cohesion score 0.07188160676532769 - nodes in this community are weakly interconnected._
- **Should `Phase 2 — Tooling and design system` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `Development Specification — Markdown-UI DSL v2 Program` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._