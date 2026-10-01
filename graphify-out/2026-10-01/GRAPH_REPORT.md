# Graph Report - markdown-ui-dsl  (2026-10-01)

## Corpus Check
- 213 files · ~134,876 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 6, .whl 5, .ebnf 2)

## Summary
- 2018 nodes · 3169 edges · 166 communities (140 shown, 26 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 50 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a8516fce`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- skills.py
- Phase 2 — Tooling and design system
- Locked-In Feature Additions — Markdown-UI DSL v2
- reference.sh
- Implementation Plan — Markdown-UI DSL v2 Program
- Competitive Research Catalogue — Markdown-UI DSL
- engine.ts
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
- safety.ts
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
- compat.test.ts
- core/tsconfig.json
- spec/tsconfig.json
- spec/src/index.ts
- ADR-005 — DSL 1.0.x ambiguity and escaping decisions (T-011, LNG-09)
- catalog/test/catalog.test.ts
- render.ts
- measure.mjs
- analyze.ts
- core/src/index.ts
- label
- stream.ts
- inline.ts
- analysis.ts
- ast.schema.json
- attrs
- catalog.ts
- main.ts
- cli/package.json
- kind
- type
- Line
- $defs
- export.ts
- frontmatter.ts
- diff.ts
- a11y.ts
- lint/package.json
- children
- properties
- run.mjs
- conformance.test.ts
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
- expand
- Phase 6 — 2.1 ecosystem
- cli/src/index.ts
- packages_core_dist_index
- InlineBinding
- InlineCode
- traceability.ts
- 5. Novel / breakthrough features
- properties
- RFC NNNN — Title
- vitest
- AGENTS.md — markdown-ui-dsl
- Phase 5 — Interop, docs and GA release
- Build something great.
- SKILL.md
- Contributing
- 4. Phases
- Span
- e2e/tsconfig.json
- InlineImage
- InlineInput
- InlineLink
- prompt.ts
- Installation & Setup
- SP-4 — Token-cost baseline (mdui vs A2UI v1.0 JSON)
- eslint.config.js
- catalog/test/tsconfig.json
- rule.ts
- cli/test/tsconfig.json
- cli/tsconfig.json
- gen-ast-schema.mjs
- lint/test/tsconfig.json
- render/test/tsconfig.json
- Tabs
- tokens/test/tsconfig.json
- tools/test/tsconfig.json
- cli.test.ts
- Lint rules and diagnostic codes
- Task Breakdown — Markdown-UI DSL v2 Program
- catalog/tsconfig.json
- 3. Feature register
- lint/tsconfig.json
- render/tsconfig.json
- tokens/tsconfig.json
- tools/tsconfig.json
- 00_simple-login-form.ui.md
- messy.in.md
- messy.out.md
- InlineButton
- ADR-006: Skill structure and context budget
- Development Specification — Markdown-UI DSL v2 Program
- Requirements
- gen-lint-docs.mjs
- InlineToggle
- required
- 8. Requirements (EARS)
- Requirements
- properties
- schema.test.ts
- @mdui/cli
- 1. Objective
- 7. Boundaries
- Using `.ui.md` with spec-driven workflows
- Feature Specification: Login
- login/login.ui.md
- auth/login.ui.md
- 001-login/login.ui.md
- 14. Reference library — `reference/` (lift, don't re-invent)
- Angular Material
- Lit + Material Web
- React + shadcn/ui
- SwiftUI
- Vue + Nuxt UI
- ref_node_fs

## God Nodes (most connected - your core abstractions)
1. `vitest` - 37 edges
2. `$defs` - 35 edges
3. `kind` - 30 edges
4. `lint()` - 24 edges
5. `parse()` - 23 edges
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
- `3.5 Quality & governance (QLT)` --references--> `lint()`  [INFERRED]
  docs/FEATURE_ADDITIONS.md → packages/lint/src/engine.ts
- `6. Testing strategy` --references--> `lint()`  [INFERRED]
  docs/SPEC.md → packages/lint/src/engine.ts
- `T-003 · Continuous integration` --references--> `lint()`  [INFERRED]
  docs/TASKS.md → packages/lint/src/engine.ts

## Import Cycles
- None detected.

## Communities (166 total, 26 thin omitted)

### Community 0 - "skills.py"
Cohesion: 0.07
Nodes (21): Conformance corpus, Fixture, Outline, Runner protocol, Construct → production, Decisions and ambiguities handed to T-011, DSL 1.0.3 — grammar notes, declared() (+13 more)

### Community 1 - "Phase 2 — Tooling and design system"
Cohesion: 0.12
Nodes (16): Phase 2 — Tooling and design system, T-014 · Diagnostics model and code registry, T-030 · Lint engine completion, T-031 · Semantic and flow lint rules, T-032 · Accessibility semantics and rules, T-034 · Canonical formatter, T-035 · Semantic diff, T-036 · Migrate tool (+8 more)

### Community 2 - "Locked-In Feature Additions — Markdown-UI DSL v2"
Cohesion: 0.18
Nodes (11): 10. Change log (rev. 2), 1. Design principles (non-negotiable constraints on every feature), 2. Priority and release key, 4. Feature dependency overview, 6. How the novel features compound, 7. Explicit non-goals (locked out of scope), 8. Change control, 9. Feature → task traceability (+3 more)

### Community 3 - "reference.sh"
Cohesion: 0.60
Nodes (5): detect_license(), die(), group_paths(), repo_of(), reference.sh script

### Community 4 - "Implementation Plan — Markdown-UI DSL v2 Program"
Cohesion: 0.14
Nodes (14): 10. Communication and migration plan, 11. Definition of ready (per task, before starting), 12. Immediate next actions, 13. Competitive-intelligence cadence, 15. Agent skills and the code map (development environment), 1. Planning principles, 2. Target architecture, 3. Dependency graph (phase level, with spine) (+6 more)

### Community 5 - "Competitive Research Catalogue — Markdown-UI DSL"
Cohesion: 0.09
Nodes (23): 1. Executive summary, 2.1 Approach, 2.2 Source quality tiers, 2.3 Limitations and how to read novelty claims, 2.4 Verification pass (rev. 2, same day), 2. Method, 3.1 Capabilities (what exists), 3.2 Defects and risks found in the repository itself (+15 more)

### Community 6 - "engine.ts"
Cohesion: 0.10
Nodes (31): ALL_RULES, better(), dedupe(), DesignSystemLint, fixSource(), lint(), lintDesignSystem(), LintResult (+23 more)

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
Cohesion: 0.13
Nodes (15): Phase 3 — Agent integration, evals and the grammar pack, T-050 · Component catalog schema and loader, T-051 · Catalog lint rules, T-052 · Component map, T-053 · Agent Skills restructure, T-054 · Prompt generator, T-055 · Safety hardening, T-056 · SDD interoperability (+7 more)

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

### Community 31 - "safety.ts"
Cohesion: 0.20
Nodes (8): ALLOWED_SCHEMES, instructionLikeText, normaliseTarget(), safetyRules, schemeOf(), STRONG, urlScheme, WEAK

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

### Community 43 - "compat.test.ts"
Cohesion: 0.18
Nodes (9): BROKEN_FRONTMATTER, CHANGES_MEANING, dir, examples, Fixture, fixtures, shared, strip() (+1 more)

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
Cohesion: 0.06
Nodes (33): Progress, T-001 · Fix example and documentation defects, T-003 · Continuous integration, T-004 · Governance and contributor docs, T-005 · Traceability checker, CatalogIssue, loadCatalog(), TRUSTS (+25 more)

### Community 49 - "render.ts"
Cohesion: 0.13
Nodes (26): axePath, examples, exe, files, require, styles, esc(), MAP (+18 more)

### Community 50 - "measure.mjs"
Cohesion: 0.20
Nodes (6): { encode: cl100k }, { encode: o200k }, require, rows, sm, su

### Community 51 - "analyze.ts"
Cohesion: 0.15
Nodes (33): add(), analyze(), checkBinding(), collectActions(), flowChecks(), includeUse(), inlineChecks(), keySpan() (+25 more)

### Community 52 - "core/src/index.ts"
Cohesion: 0.10
Nodes (24): ActionDef, ActionRegistry, AnalyzeOptions, AnalyzeResult, CodeInfo, CODES, DiagnosticCode, Pos (+16 more)

### Community 53 - "label"
Cohesion: 0.09
Nodes (24): type, Divider, InlineBadge, InlineCheckbox, InlineRadio, additionalProperties, properties, required (+16 more)

### Community 54 - "stream.ts"
Cohesion: 0.14
Nodes (19): Ctx, ResolvedInclude, BlockNode, Document, FrontmatterNode, Diagnostic, node(), outline() (+11 more)

### Community 55 - "inline.ts"
Cohesion: 0.08
Nodes (41): ADR-0005, T-002 · Monorepo scaffold and architecture decision records, AttrIssue, ENUMS, parseAttrs(), printAttrs(), RESERVED_FLAGS, RESERVED_KEYS (+33 more)

### Community 56 - "analysis.ts"
Cohesion: 0.12
Nodes (20): checkBreakpoints(), checkContrast(), checkOrphans(), checkPrimary(), checkRefs(), colorOf(), ContrastPair, contrastPairs() (+12 more)

### Community 57 - "ast.schema.json"
Cohesion: 0.07
Nodes (27): additionalProperties, items, type, items, description, items, type, enum (+19 more)

### Community 58 - "attrs"
Cohesion: 0.11
Nodes (22): additionalProperties, required, type, $ref, type, additionalProperties, properties, required (+14 more)

### Community 59 - "catalog.ts"
Cohesion: 0.09
Nodes (12): catalogRules, componentProps, CONTAINER_NAME, INLINE_BUILTIN, thirdPartyComponent, unknownComponent, Use, uses() (+4 more)

### Community 60 - "main.ts"
Cohesion: 0.09
Nodes (5): COMMANDS, FileReport, RANK, dir, NEW

### Community 61 - "cli/package.json"
Cohesion: 0.08
Nodes (25): bin, mdui, dependencies, @mdui/catalog, @mdui/core, @mdui/lint, @mdui/render, @mdui/tokens (+17 more)

### Community 62 - "kind"
Cohesion: 0.12
Nodes (24): properties, additionalProperties, properties, required, type, Comment, properties, properties (+16 more)

### Community 63 - "type"
Cohesion: 0.12
Nodes (23): enum, Directive, additionalProperties, properties, required, type, items, type (+15 more)

### Community 64 - "Line"
Cohesion: 0.12
Nodes (17): minimum, type, Line, Pos, additionalProperties, minimum, required, type (+9 more)

### Community 65 - "$defs"
Cohesion: 0.08
Nodes (25): oneOf, $defs, Block, Heading, Hint, Inline, InlineComponent, InlineWidget (+17 more)

### Community 66 - "export.ts"
Cohesion: 0.19
Nodes (20): toHex(), Dim, DTCG_TYPES, dtcgColor(), dtcgDim(), DtcgNode, ExportReport, family() (+12 more)

### Community 67 - "frontmatter.ts"
Cohesion: 0.16
Nodes (18): ADR-0004, Ctx, dslVersion(), findLine(), flow(), FrontmatterData, FrontmatterIssue, FrontmatterResult (+10 more)

### Community 68 - "diff.ts"
Cohesion: 0.16
Nodes (17): attrSig(), blockItem(), count(), Ctx, diffDocuments(), diffLists(), DiffOp, DiffResult (+9 more)

### Community 69 - "a11y.ts"
Cohesion: 0.10
Nodes (19): a11yRules, buttonText, documentLanguage, duplicateLandmark, emptyHeading, GENERIC_ALT, GENERIC_LINK, headingOrder (+11 more)

### Community 70 - "lint/package.json"
Cohesion: 0.11
Nodes (18): dependencies, @mdui/catalog, @mdui/core, @mdui/tokens, description, exports, files, @mdui/catalog (+10 more)

### Community 71 - "children"
Cohesion: 0.17
Nodes (12): type, InlineEm, InlineStrong, additionalProperties, properties, required, type, additionalProperties (+4 more)

### Community 72 - "properties"
Cohesion: 0.11
Nodes (19): additionalProperties, pattern, required, type, Code, Diagnostic, additionalProperties, properties (+11 more)

### Community 73 - "run.mjs"
Cohesion: 0.12
Nodes (7): BUDGETS_MS, dir, examples, machine, results, src, stream

### Community 74 - "conformance.test.ts"
Cohesion: 0.22
Nodes (7): dir, Fixture, invalid, invalid2, schema, valid, valid2

### Community 75 - "semantic.ts"
Cohesion: 0.11
Nodes (17): dataFile, destructiveWithoutConfirm, flowDeadEnd, flowReferences, flowUnreachableScreen, frontmatterValid, includeCycle, invalidAttribute (+9 more)

### Community 76 - "RFC 0001 — DSL 2.0 syntax"
Cohesion: 0.12
Nodes (16): 10. Security, 11. Unresolved questions, 1. Summary, 2. Motivation, 3. Syntax and semantics, 3a. Closers, attributes, field attributes (LNG-02, LNG-03), 3b. New primitives (LNG-04), 3c. Regions, states, data, includes (LNG-05, LNG-06, LNG-07) (+8 more)

### Community 77 - "catalog/package.json"
Cohesion: 0.12
Nodes (16): dependencies, @mdui/core, yaml, description, exports, files, @mdui/core, yaml (+8 more)

### Community 78 - "tokens.ts"
Cohesion: 0.18
Nodes (7): brokenRef, contrastRatio, ds(), missingPrimary, orphanedToken, tokenRules, unknownBreakpoint

### Community 80 - "tokens/src/model.ts"
Cohesion: 0.14
Nodes (16): DsCode, DsDiagnostic, GROUPS, lineMap(), loadDesignSystem(), MduiExtension, Resolved, sections() (+8 more)

### Community 81 - "tools/package.json"
Cohesion: 0.10
Nodes (20): dependencies, @mdui/catalog, @mdui/core, @mdui/lint, @mdui/tokens, description, exports, files (+12 more)

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

### Community 89 - "expand"
Cohesion: 0.18
Nodes (17): Args, parseArgs(), UsageError, VALUE_FLAGS, expand(), globToRegExp(), isGlob(), failsOn() (+9 more)

### Community 90 - "Phase 6 — 2.1 ecosystem"
Cohesion: 0.17
Nodes (12): Phase 6 — 2.1 ecosystem, T-100 · VS Code extension and language server, T-101 · GitHub Action and PR wireframe diff, T-102 · Figma importer, T-103 · HTML importer, T-104 · Adaptive Cards / Block Kit / Open-JSON-UI / A2UI-Express exporters, T-105 · Runtime generative-UI renderer (React), T-106 · Flutter oracle adapter (+4 more)

### Community 91 - "cli/src/index.ts"
Cohesion: 0.23
Nodes (10): io, Config, ConfigError, FailOn, KEYS, loadConfig(), SKIP_DIRS, walk() (+2 more)

### Community 92 - "packages_core_dist_index"
Cohesion: 0.10
Nodes (17): 3.2 Tooling (TLS), coverage(), CoverageReport, declaredRequirements, extractRequirements(), formatCoverage(), parentOf(), Requirement (+9 more)

### Community 93 - "InlineBinding"
Cohesion: 0.17
Nodes (12): InlineBinding, InlineUse, additionalProperties, properties, required, type, additionalProperties, properties (+4 more)

### Community 94 - "InlineCode"
Cohesion: 0.17
Nodes (12): InlineCode, InlineText, additionalProperties, properties, required, type, additionalProperties, properties (+4 more)

### Community 95 - "traceability.ts"
Cohesion: 0.27
Nodes (4): r, checkTraceability(), Report, taskBlocks()

### Community 96 - "5. Novel / breakthrough features"
Cohesion: 0.22
Nodes (8): 5. Novel / breakthrough features, NOV-01 — Anchored Three-Way Sync (`.ui.lock`), NOV-02 — Spec Oracle (accessibility-tree conformance with a Fidelity Score), NOV-03 — Valid-by-Construction Grammar Pack, NOV-04 — UX Constraint Contracts, 2.3 AST (TLS-01), dsl(), AST JSON Schema

### Community 97 - "properties"
Cohesion: 0.20
Nodes (10): InlineDropdown, type, additionalProperties, properties, required, type, items, type (+2 more)

### Community 98 - "RFC NNNN — Title"
Cohesion: 0.22
Nodes (8): Alternatives considered, Compatibility, Motivation, RFC NNNN — Title, Security, Summary, Syntax and semantics, Unresolved questions

### Community 99 - "vitest"
Cohesion: 0.08
Nodes (23): equivalent(), format(), strip(), parse(), directives(), conf, corpus, docs (+15 more)

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
Cohesion: 0.08
Nodes (20): Breakpoints, Component mappings, Environments, Jetpack Compose, Row, Safety and trust model, Keeping spec and code in sync, Components (+12 more)

### Community 104 - "Contributing"
Cohesion: 0.29
Nodes (7): Agent contributors, Changing the language: RFCs, Contributing, How work flows, Quick start, Reference library and lifting code, Versioning

### Community 105 - "4. Phases"
Cohesion: 0.25
Nodes (8): 4. Phases, Phase 0 — Foundations & hygiene  *(≈ 8 days)*, Phase 1 — Language core  *(≈ 59 days; contains the spine)*, Phase 2 — Tooling & design system  *(≈ 37 days)*, Phase 3 — Agent integration, evals, grammar pack  *(≈ 46 days)*, Phase 4 — Sync, Oracle, Constraints  *(≈ 46 days — the breakthrough features)*, Phase 5 — Interop, embedding, benchmark, docs, GA  *(≈ 27 days)*, Phase 6 — 2.1 ecosystem  *(≈ 43 days; independent items)*

### Community 106 - "Span"
Cohesion: 0.22
Nodes (9): Span, $ref, end, start, additionalProperties, properties, required, type (+1 more)

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

### Community 111 - "prompt.ts"
Cohesion: 0.10
Nodes (14): Agent, AGENTS, bullets(), composePrompt(), EXAMPLES, PromptInput, render(), Section (+6 more)

### Community 112 - "Installation & Setup"
Cohesion: 0.40
Nodes (5): 1. OpenClaw Hub (Recommended), 2. GitHub Copilot (Agent Mode), 3. Claude Code, Codex, Gemini CLI, Cursor and other Agent Skills hosts, 4. Flat-file agents (`.cursorrules`, `.clinerules`, `CLAUDE.md`, system prompts), Installation & Setup

### Community 113 - "SP-4 — Token-cost baseline (mdui vs A2UI v1.0 JSON)"
Cohesion: 0.33
Nodes (5): Decisions fed to RFC-0001, Method, Result (o200k_base), SP-4 — Token-cost baseline (mdui vs A2UI v1.0 JSON), What this does and does not show

### Community 114 - "eslint.config.js"
Cohesion: 0.33
Nodes (4): ADR-0003, NODE_BUILTINS, @eslint/js, typescript-eslint

### Community 115 - "catalog/test/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, types, extends, include, ../../../tsconfig.base.json

### Community 116 - "rule.ts"
Cohesion: 0.11
Nodes (13): Finding, LintConfig, Rule, RuleCategory, RuleContext, RuleSetting, balancedBlocks, brokenLinkOrInclude (+5 more)

### Community 117 - "cli/test/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, types, extends, include, ../../../tsconfig.base.json

### Community 118 - "cli/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, types, extends, include, ../../tsconfig.base.json

### Community 119 - "gen-ast-schema.mjs"
Cohesion: 0.17
Nodes (7): defs, file, int1, schema, span, str, withAttrs

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

### Community 129 - "3. Feature register"
Cohesion: 0.40
Nodes (5): 3.1 Language (LNG), 3.3 Design system & tokens (DSY), 3.4 Agent integration (AGT), 3.5 Quality & governance (QLT), 3. Feature register

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

### Community 140 - "InlineButton"
Cohesion: 0.29
Nodes (7): type, InlineButton, additionalProperties, properties, required, type, action

### Community 141 - "ADR-006: Skill structure and context budget"
Cohesion: 0.50
Nodes (3): ADR-006: Skill structure and context budget, Consequences, Decision

### Community 142 - "Development Specification — Markdown-UI DSL v2 Program"
Cohesion: 0.25
Nodes (8): 0. Assumptions surfaced (confirm or correct before Phase 0 starts), 10. Risks (spec-level; schedule risks are in PLAN §8), 3. Commands, 4. Project structure, 5. Code style, 6. Testing strategy, 9. Success criteria (release gates), Development Specification — Markdown-UI DSL v2 Program

### Community 143 - "Requirements"
Cohesion: 0.29
Nodes (6): Acceptance Criteria, Acceptance Criteria, Requirement 1: Sign in, Requirement 2: Password reset, Requirements, Requirements Document

### Community 144 - "gen-lint-docs.mjs"
Cohesion: 0.29
Nodes (3): codeRows, file, rows

### Community 145 - "InlineToggle"
Cohesion: 0.29
Nodes (7): InlineToggle, additionalProperties, properties, required, type, type, on

### Community 146 - "required"
Cohesion: 0.33
Nodes (6): 2.1 Compatibility baseline (v1.0.3, unchanged), 2.2 DSL 2.0 additions, 2.4 Diagnostics, 2. Language specification (normative drafts — finalised via RFC-0001 in T-012), Language, required()

### Community 147 - "8. Requirements (EARS)"
Cohesion: 0.33
Nodes (6): 8. Requirements (EARS), Agent, Design system, Novel, Quality, Tooling

### Community 148 - "Requirements"
Cohesion: 0.33
Nodes (5): Auth Specification, Requirement: Password reset, Requirement: Sign in, Requirements, Scenario: Valid credentials

### Community 149 - "properties"
Cohesion: 0.29
Nodes (7): properties, additionalProperties, type, items, type, named, positional

### Community 150 - "schema.test.ts"
Cohesion: 0.33
Nodes (5): fixtureFiles, inputs, schema, validate, ajv

### Community 151 - "@mdui/cli"
Cohesion: 0.40
Nodes (4): `diff --json`, `--json` output (version 1), @mdui/cli, `prompt`

### Community 152 - "1. Objective"
Cohesion: 0.50
Nodes (4): 1.1 What and why, 1.2 Users, 1.3 Success (summary — full criteria in §9), 1. Objective

### Community 153 - "7. Boundaries"
Cohesion: 0.50
Nodes (4): 7. Boundaries, ✅ Always, ⚠️ Ask first, 🚫 Never

### Community 159 - "14. Reference library — `reference/` (lift, don't re-invent)"
Cohesion: 0.40
Nodes (5): 14.1 Paths by group, 14.2 Consult-first paths by phase / task, 14.3 Highest-leverage lifts (where reference code removes the most work), 14.4 Not vendored (and where to look instead), 14. Reference library — `reference/` (lift, don't re-invent)

### Community 160 - "Angular Material"
Cohesion: 0.40
Nodes (4): Angular Material, Breakpoints, Component mappings, Environments

### Community 161 - "Lit + Material Web"
Cohesion: 0.40
Nodes (4): Breakpoints, Component mappings, Environments, Lit + Material Web

### Community 162 - "React + shadcn/ui"
Cohesion: 0.40
Nodes (4): Breakpoints, Component mappings, Environments, React + shadcn/ui

### Community 163 - "SwiftUI"
Cohesion: 0.40
Nodes (4): Breakpoints, Component mappings, Environments, SwiftUI

### Community 164 - "Vue + Nuxt UI"
Cohesion: 0.40
Nodes (4): Breakpoints, Component mappings, Environments, Vue + Nuxt UI

## Knowledge Gaps
- **979 isolated node(s):** `$schema`, `changelog`, `commit`, `access`, `baseBranch` (+974 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1151 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Progress` connect `catalog/test/catalog.test.ts` to `vitest`, `diff.ts`, `engine.ts`, `prompt.ts`, `tokens/src/model.ts`, `stream.ts`, `inline.ts`, `packages_core_dist_index`, `Task Breakdown — Markdown-UI DSL v2 Program`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `Task Breakdown — Markdown-UI DSL v2 Program` connect `Task Breakdown — Markdown-UI DSL v2 Program` to `Phase 2 — Tooling and design system`, `Phase 5 — Interop, docs and GA release`, `Phase 6 — 2.1 ecosystem`, `Phase 1 — Language core`, `README.md`, `Phase 3 — Agent integration, evals and the grammar pack`, `catalog/test/catalog.test.ts`, `Phase 4 — Sync, verification and constraints (the novel features)`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `vitest` connect `vitest` to `engine.ts`, `parse.ts`, `schema.test.ts`, `package.json`, `ref_node_fs`, `compat.test.ts`, `catalog/test/catalog.test.ts`, `render.ts`, `analyze.ts`, `core/src/index.ts`, `stream.ts`, `analysis.ts`, `main.ts`, `frontmatter.ts`, `diff.ts`, `conformance.test.ts`, `export.test.ts`, `color.ts`, `packages_core_dist_index`, `traceability.ts`, `prompt.ts`, `cli.test.ts`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **What connects `$schema`, `changelog`, `commit` to the rest of the system?**
  _979 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `skills.py` be split into smaller, more focused modules?**
  _Cohesion score 0.0666049953746531 - nodes in this community are weakly interconnected._
- **Should `Phase 2 — Tooling and design system` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `Implementation Plan — Markdown-UI DSL v2 Program` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._