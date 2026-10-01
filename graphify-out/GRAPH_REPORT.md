# Graph Report - markdown-ui-dsl  (2026-10-01)

## Corpus Check
- 243 files · ~150,211 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 6, .whl 5, .ebnf 2)

## Summary
- 2279 nodes · 3647 edges · 175 communities (151 shown, 24 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 66 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b2f1a462`
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
- build.ts
- ADR-005 — DSL 1.0.x ambiguity and escaping decisions (T-011, LNG-09)
- packages_core_dist_index
- render.ts
- mcp/package.json
- analyze.ts
- core/src/index.ts
- kind
- stream.test.ts
- inline.ts
- analysis.ts
- ast.schema.json
- args
- catalog.ts
- main.ts
- cli/package.json
- span
- properties
- Line
- $defs
- export.ts
- frontmatter.ts
- diff.ts
- a11y.ts
- lint/package.json
- properties
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
- ast.ts
- Phase 6 — 2.1 ecosystem
- cli/src/index.ts
- tools/src/index.ts
- InlineBinding
- InlineCode
- traceability.ts
- structural.test.ts
- properties
- RFC NNNN — Title
- vitest
- AGENTS.md — markdown-ui-dsl
- Phase 5 — Interop, docs and GA release
- Build something great.
- SKILL.md
- Contributing
- tools.ts
- Span
- e2e/tsconfig.json
- InlineImage
- InlineInput
- prompt.test.ts
- prompt.ts
- Installation & Setup
- SP-4 — Token-cost baseline (mdui vs A2UI v1.0 JSON)
- eslint.config.js
- catalog/test/tsconfig.json
- lint/src/index.ts
- cli/test/tsconfig.json
- cli/tsconfig.json
- gen-ast-schema.mjs
- lint/test/tsconfig.json
- render/test/tsconfig.json
- type
- tokens/test/tsconfig.json
- tools/test/tsconfig.json
- grammar/package.json
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
- packages_core_dist_index_parse
- ADR-006: Skill structure and context budget
- Development Specification — Markdown-UI DSL v2 Program
- Requirements
- ref_node_fs
- engine-smoke.py
- required
- 8. Requirements (EARS)
- Requirements
- format.ts
- schema.test.ts
- @mdui/cli
- Conformance corpus
- 7. Boundaries
- mcp-client-py.py
- Feature Specification: Login
- login/login.ui.md
- auth/login.ui.md
- 001-login/login.ui.md
- reference-manifest.py
- Angular Material
- Lit + Material Web
- React + shadcn/ui
- SwiftUI
- Vue + Nuxt UI
- Generation grammars (NOV-03)
- grammar/test/tsconfig.json
- mcp/test/tsconfig.json
- mcp/tsconfig.json
- 2. Method
- MCP server (`@mdui/mcp`)
- 5. Novel / breakthrough features
- grammar/tsconfig.json

## God Nodes (most connected - your core abstractions)
1. `vitest` - 40 edges
2. `$defs` - 35 edges
3. `kind` - 30 edges
4. `lint()` - 24 edges
5. `parse()` - 23 edges
6. `Phase 1 — Language core` - 21 edges
7. `compilerOptions` - 19 edges
8. `parseWith()` - 18 edges
9. `dict()` - 17 edges
10. `scripts` - 16 edges

## Surprising Connections (you probably didn't know these)
- `What it does not guarantee` --references--> `recognize()`  [INFERRED]
  docs/GRAMMAR.md → packages/grammar/src/earley.ts
- `Quality` --references--> `alt()`  [INFERRED]
  docs/SPEC.md → packages/grammar/src/model.ts
- `1. Executive summary` --references--> `lint()`  [INFERRED]
  docs/COMPETITIVE_RESEARCH.md → packages/lint/src/engine.ts
- `4.3 Design-system and design-token formats for agents` --references--> `lint()`  [INFERRED]
  docs/COMPETITIVE_RESEARCH.md → packages/lint/src/engine.ts
- `T-003 · Continuous integration` --references--> `lint()`  [INFERRED]
  docs/TASKS.md → packages/lint/src/engine.ts

## Import Cycles
- None detected.

## Communities (175 total, 24 thin omitted)

### Community 0 - "skills.py"
Cohesion: 0.30
Nodes (7): cmd_install(), cmd_sync(), cmd_verify(), copy_tree(), load(), source_dir(), tree_hash()

### Community 1 - "Phase 2 — Tooling and design system"
Cohesion: 0.15
Nodes (13): Phase 2 — Tooling and design system, T-031 · Semantic and flow lint rules, T-032 · Accessibility semantics and rules, T-034 · Canonical formatter, T-035 · Semantic diff, T-036 · Migrate tool, T-037 · Design-system loader (DESIGN.md + legacy), T-038 · Token references and exporters (+5 more)

### Community 2 - "Locked-In Feature Additions — Markdown-UI DSL v2"
Cohesion: 0.18
Nodes (11): 10. Change log (rev. 2), 1. Design principles (non-negotiable constraints on every feature), 2. Priority and release key, 4. Feature dependency overview, 6. How the novel features compound, 7. Explicit non-goals (locked out of scope), 8. Change control, 9. Feature → task traceability (+3 more)

### Community 3 - "reference.sh"
Cohesion: 0.60
Nodes (5): detect_license(), die(), group_paths(), repo_of(), reference.sh script

### Community 4 - "Implementation Plan — Markdown-UI DSL v2 Program"
Cohesion: 0.08
Nodes (26): 10. Communication and migration plan, 11. Definition of ready (per task, before starting), 12. Immediate next actions, 13. Competitive-intelligence cadence, 14.1 Paths by group, 14.2 Consult-first paths by phase / task, 14.3 Highest-leverage lifts (where reference code removes the most work), 14.4 Not vendored (and where to look instead) (+18 more)

### Community 5 - "Competitive Research Catalogue — Markdown-UI DSL"
Cohesion: 0.11
Nodes (18): 1. Executive summary, 3.1 Capabilities (what exists), 3.2 Defects and risks found in the repository itself, 3. Baseline audit of `markdown-ui-dsl` v1.0.3, 4.1 Markdown- and text-native UI/wireframe languages — *direct competitors*, 4.2 Agent-to-UI protocols and generative-UI frameworks, 4.3 Design-system and design-token formats for agents, 4.4 Spec-driven development (SDD) and agent-instruction standards (+10 more)

### Community 6 - "engine.ts"
Cohesion: 0.10
Nodes (23): T-063 · LLM eval harness and TESTING.md rewrite, ALL_RULES, better(), dedupe(), fixSource(), lint(), lintDesignSystem(), measure() (+15 more)

### Community 7 - "Markdown UI DSL for AI Agents"
Cohesion: 0.13
Nodes (15): Components, Contributing, Design Theming, Events & Interactivity, Layouts, License, Markdown UI DSL for AI Agents, Recommended Project Structure (+7 more)

### Community 8 - "Phase 1 — Language core"
Cohesion: 0.07
Nodes (41): 15. Agent skills and the code map (development environment), 6. Testing strategy, Phase 1 — Language core, T-006 · Reference-library hygiene and CI guards, T-010 · Normative grammar for v1.0.3, T-011 · Ambiguity and escaping decisions, T-012 · RFC-0001 — DSL 2.0 syntax, T-013 · Conformance corpus v1 and protocol (+33 more)

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
Cohesion: 0.14
Nodes (23): ContainerKind, ContainerNode, NamedBlockNode, Attrs, dslVersion(), InlineIssue, WithAttrs, alignOf() (+15 more)

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
Nodes (14): dependencies, @mdui/spec, description, exports, files, @mdui/spec, license, name (+6 more)

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
Cohesion: 0.33
Nodes (5): compilerOptions, resolveJsonModule, extends, include, ../../tsconfig.base.json

### Community 46 - "build.ts"
Cohesion: 0.06
Nodes (64): ALNUM, buildGrammar(), DIGIT, FIXED, GrammarOptions, IDENT, INLINE_BUILTINS, INT (+56 more)

### Community 47 - "ADR-005 — DSL 1.0.x ambiguity and escaping decisions (T-011, LNG-09)"
Cohesion: 0.50
Nodes (3): Addendum (T-016) — emphasis, Addendum (T-030) — user text as object keys, ADR-005 — DSL 1.0.x ambiguity and escaping decisions (T-011, LNG-09)

### Community 48 - "packages_core_dist_index"
Cohesion: 0.05
Nodes (34): Progress, T-001 · Fix example and documentation defects, T-003 · Continuous integration, T-004 · Governance and contributor docs, T-005 · Traceability checker, CatalogIssue, loadCatalog(), TRUSTS (+26 more)

### Community 49 - "render.ts"
Cohesion: 0.07
Nodes (37): { encode: cl100k }, { encode: o200k }, require, rows, sm, su, axePath, examples (+29 more)

### Community 50 - "mcp/package.json"
Cohesion: 0.06
Nodes (30): bin, mdui-mcp, dependencies, @mdui/catalog, @mdui/core, @mdui/grammar, @mdui/lint, @mdui/render (+22 more)

### Community 51 - "analyze.ts"
Cohesion: 0.15
Nodes (34): add(), analyze(), checkBinding(), collectActions(), flowChecks(), includeUse(), inlineChecks(), keySpan() (+26 more)

### Community 52 - "core/src/index.ts"
Cohesion: 0.12
Nodes (20): T-014 · Diagnostics model and code registry, T-030 · Lint engine completion, ActionDef, ActionRegistry, AnalyzeOptions, AnalyzeResult, CodeInfo, CODES (+12 more)

### Community 53 - "kind"
Cohesion: 0.08
Nodes (34): type, $ref, type, Divider, InlineBadge, InlineRadio, additionalProperties, properties (+26 more)

### Community 54 - "stream.test.ts"
Cohesion: 0.21
Nodes (10): Ctx, ResolvedInclude, Document, Diagnostic, parseStream(), StreamParser, docs, nodeJson() (+2 more)

### Community 55 - "inline.ts"
Cohesion: 0.08
Nodes (37): ADR-0005, T-002 · Monorepo scaffold and architecture decision records, AttrIssue, ENUMS, parseAttrs(), RESERVED_FLAGS, RESERVED_KEYS, RESERVED_NUMBERS (+29 more)

### Community 56 - "analysis.ts"
Cohesion: 0.12
Nodes (20): checkBreakpoints(), checkContrast(), checkOrphans(), checkPrimary(), checkRefs(), colorOf(), ContrastPair, contrastPairs() (+12 more)

### Community 57 - "ast.schema.json"
Cohesion: 0.07
Nodes (29): additionalProperties, items, type, items, description, items, type, enum (+21 more)

### Community 58 - "args"
Cohesion: 0.08
Nodes (25): additionalProperties, properties, required, type, InlineComponent, InlineWidget, additionalProperties, properties (+17 more)

### Community 59 - "catalog.ts"
Cohesion: 0.10
Nodes (11): catalogRules, componentProps, CONTAINER_NAME, INLINE_BUILTIN, thirdPartyComponent, unknownComponent, Use, uses() (+3 more)

### Community 60 - "main.ts"
Cohesion: 0.11
Nodes (20): Args, parseArgs(), UsageError, VALUE_FLAGS, COMMANDS, failsOn(), FileReport, listRules() (+12 more)

### Community 61 - "cli/package.json"
Cohesion: 0.07
Nodes (29): bin, mdui, dependencies, @mdui/catalog, @mdui/core, @mdui/grammar, @mdui/lint, @mdui/render (+21 more)

### Community 62 - "span"
Cohesion: 0.10
Nodes (25): properties, additionalProperties, properties, required, type, Comment, Hint, properties (+17 more)

### Community 63 - "properties"
Cohesion: 0.17
Nodes (12): enum, Directive, additionalProperties, properties, required, type, items, type (+4 more)

### Community 64 - "Line"
Cohesion: 0.12
Nodes (17): minimum, type, Line, Pos, additionalProperties, minimum, required, type (+9 more)

### Community 65 - "$defs"
Cohesion: 0.08
Nodes (25): oneOf, $defs, Block, Heading, Inline, InlineButton, InlineCheckbox, InlineLink (+17 more)

### Community 66 - "export.ts"
Cohesion: 0.19
Nodes (20): toHex(), Dim, DTCG_TYPES, dtcgColor(), dtcgDim(), DtcgNode, ExportReport, family() (+12 more)

### Community 67 - "frontmatter.ts"
Cohesion: 0.16
Nodes (17): ADR-0004, Ctx, findLine(), flow(), FrontmatterData, FrontmatterIssue, FrontmatterResult, KNOWN_KEYS (+9 more)

### Community 68 - "diff.ts"
Cohesion: 0.18
Nodes (15): attrSig(), blockItem(), count(), Ctx, diffDocuments(), diffLists(), emit(), formatDiff() (+7 more)

### Community 69 - "a11y.ts"
Cohesion: 0.10
Nodes (19): a11yRules, buttonText, documentLanguage, duplicateLandmark, emptyHeading, GENERIC_ALT, GENERIC_LINK, headingOrder (+11 more)

### Community 70 - "lint/package.json"
Cohesion: 0.11
Nodes (18): dependencies, @mdui/catalog, @mdui/core, @mdui/tokens, description, exports, files, @mdui/catalog (+10 more)

### Community 71 - "properties"
Cohesion: 0.08
Nodes (26): type, type, additionalProperties, properties, required, type, Container, InlineEm (+18 more)

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
Cohesion: 0.12
Nodes (16): scripts, bench, build, changeset, check, format, format:check, lint (+8 more)

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

### Community 89 - "ast.ts"
Cohesion: 0.16
Nodes (24): Base, BlockNode, CodeNode, CommentNode, DirectiveNode, DividerNode, FrontmatterNode, HeadingNode (+16 more)

### Community 90 - "Phase 6 — 2.1 ecosystem"
Cohesion: 0.17
Nodes (12): Phase 6 — 2.1 ecosystem, T-100 · VS Code extension and language server, T-101 · GitHub Action and PR wireframe diff, T-102 · Figma importer, T-103 · HTML importer, T-104 · Adaptive Cards / Block Kit / Open-JSON-UI / A2UI-Express exporters, T-105 · Runtime generative-UI renderer (React), T-106 · Flutter oracle adapter (+4 more)

### Community 91 - "cli/src/index.ts"
Cohesion: 0.17
Nodes (15): io, Config, ConfigError, FailOn, KEYS, loadConfig(), expand(), globToRegExp() (+7 more)

### Community 92 - "tools/src/index.ts"
Cohesion: 0.11
Nodes (19): 3.2 Tooling (TLS), `coverage`, coverage(), CoverageReport, declaredRequirements, extractRequirements(), formatCoverage(), parentOf() (+11 more)

### Community 93 - "InlineBinding"
Cohesion: 0.17
Nodes (12): InlineBinding, InlineUse, additionalProperties, properties, required, type, additionalProperties, properties (+4 more)

### Community 94 - "InlineCode"
Cohesion: 0.17
Nodes (12): InlineCode, InlineText, additionalProperties, properties, required, type, additionalProperties, properties (+4 more)

### Community 95 - "traceability.ts"
Cohesion: 0.38
Nodes (3): checkTraceability(), Report, taskBlocks()

### Community 96 - "structural.test.ts"
Cohesion: 0.18
Nodes (9): NOV-01 — Anchored Three-Way Sync (`.ui.lock`), Tools, 2.3 AST (TLS-01), dsl(), conf, invalid, rules(), text() (+1 more)

### Community 97 - "properties"
Cohesion: 0.20
Nodes (10): InlineDropdown, type, additionalProperties, properties, required, type, items, type (+2 more)

### Community 98 - "RFC NNNN — Title"
Cohesion: 0.22
Nodes (8): Alternatives considered, Compatibility, Motivation, RFC NNNN — Title, Security, Summary, Syntax and semantics, Unresolved questions

### Community 99 - "vitest"
Cohesion: 0.07
Nodes (25): format(), parse(), directives(), conf, corpus, docs, Fixture, golden (+17 more)

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

### Community 105 - "tools.ts"
Cohesion: 0.09
Nodes (6): catalogArg, catalogOf(), DIAG, DIAGS, docs, optStr()

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

### Community 110 - "prompt.test.ts"
Cohesion: 0.13
Nodes (7): FIXED, INLINE_BUILTINS, Json, toJsonSchema(), codes(), charts, plain

### Community 111 - "prompt.ts"
Cohesion: 0.15
Nodes (12): Agent, AGENTS, bullets(), composePrompt(), EXAMPLES, PromptInput, render(), Section (+4 more)

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

### Community 116 - "lint/src/index.ts"
Cohesion: 0.11
Nodes (19): DesignSystemLint, LintResult, applyFixes(), FixResult, FixSourceResult, Finding, LintConfig, Rule (+11 more)

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

### Community 122 - "type"
Cohesion: 0.18
Nodes (17): Tabs, items, additionalProperties, items, properties, required, type, active (+9 more)

### Community 123 - "tokens/test/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, types, extends, include, ../../../tsconfig.base.json

### Community 124 - "tools/test/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, types, extends, include, ../../../tsconfig.base.json

### Community 125 - "grammar/package.json"
Cohesion: 0.11
Nodes (18): dependencies, @mdui/catalog, @mdui/core, @mdui/lint, description, exports, files, @mdui/catalog (+10 more)

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

### Community 140 - "packages_core_dist_index_parse"
Cohesion: 0.14
Nodes (6): bad, gen, good, i, n, recN

### Community 141 - "ADR-006: Skill structure and context budget"
Cohesion: 0.50
Nodes (3): ADR-006: Skill structure and context budget, Consequences, Decision

### Community 142 - "Development Specification — Markdown-UI DSL v2 Program"
Cohesion: 0.18
Nodes (11): 0. Assumptions surfaced (confirm or correct before Phase 0 starts), 10. Risks (spec-level; schedule risks are in PLAN §8), 1.1 What and why, 1.2 Users, 1.3 Success (summary — full criteria in §9), 1. Objective, 3. Commands, 4. Project structure (+3 more)

### Community 143 - "Requirements"
Cohesion: 0.29
Nodes (6): Acceptance Criteria, Acceptance Criteria, Requirement 1: Sign in, Requirement 2: Password reset, Requirements, Requirements Document

### Community 144 - "ref_node_fs"
Cohesion: 0.14
Nodes (6): r, codeRows, file, rows, m, skill

### Community 145 - "engine-smoke.py"
Cohesion: 0.20
Nodes (3): ids_of(), report(), run_llg()

### Community 146 - "required"
Cohesion: 0.33
Nodes (6): 2.1 Compatibility baseline (v1.0.3, unchanged), 2.2 DSL 2.0 additions, 2.4 Diagnostics, 2. Language specification (normative drafts — finalised via RFC-0001 in T-012), Language, required()

### Community 147 - "8. Requirements (EARS)"
Cohesion: 0.33
Nodes (6): 8. Requirements (EARS), Agent, Design system, Novel, Quality, Tooling

### Community 148 - "Requirements"
Cohesion: 0.33
Nodes (5): Auth Specification, Requirement: Password reset, Requirement: Sign in, Requirements, Scenario: Valid credentials

### Community 149 - "format.ts"
Cohesion: 0.29
Nodes (11): printAttrs(), canonicalInline(), equivalent(), FormatResult, formatTable(), hasRich(), indentOf(), OPENER_TEXT (+3 more)

### Community 150 - "schema.test.ts"
Cohesion: 0.33
Nodes (5): fixtureFiles, inputs, schema, validate, ajv

### Community 151 - "@mdui/cli"
Cohesion: 0.20
Nodes (7): Using `.ui.md` with spec-driven workflows, Walkthrough (Spec Kit), `diff --json`, `grammar`, `--json` output (version 1), @mdui/cli, `prompt`

### Community 152 - "Conformance corpus"
Cohesion: 0.18
Nodes (9): Conformance corpus, Fixture, Outline, Runner protocol, Construct → production, Decisions and ambiguities handed to T-011, DSL 1.0.3 — grammar notes, cmd_validate() (+1 more)

### Community 153 - "7. Boundaries"
Cohesion: 0.50
Nodes (4): 7. Boundaries, ✅ Always, ⚠️ Ask first, 🚫 Never

### Community 154 - "mcp-client-py.py"
Cohesion: 0.29
Nodes (4): check(), g(), main(), sc()

### Community 159 - "reference-manifest.py"
Cohesion: 0.33
Nodes (5): declared(), first_path(), git(), licence(), main()

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

### Community 166 - "Generation grammars (NOV-03)"
Cohesion: 0.29
Nodes (7): Engine matrix, Generation grammars (NOV-03), Limits of this evidence, Parity with the reference parser, Size, against A2UI Express, What it does not guarantee, What the grammar guarantees

### Community 168 - "grammar/test/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, types, extends, include, ../../../tsconfig.base.json

### Community 169 - "mcp/test/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, types, extends, include, ../../../tsconfig.base.json

### Community 170 - "mcp/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, types, extends, include, ../../tsconfig.base.json

### Community 171 - "2. Method"
Cohesion: 0.40
Nodes (5): 2.1 Approach, 2.2 Source quality tiers, 2.3 Limitations and how to read novelty claims, 2.4 Verification pass (rev. 2, same day), 2. Method

### Community 172 - "MCP server (`@mdui/mcp`)"
Cohesion: 0.40
Nodes (4): Limits, MCP server (`@mdui/mcp`), Safety model, Verification

### Community 173 - "5. Novel / breakthrough features"
Cohesion: 0.50
Nodes (4): 5. Novel / breakthrough features, NOV-02 — Spec Oracle (accessibility-tree conformance with a Fidelity Score), NOV-03 — Valid-by-Construction Grammar Pack, NOV-04 — UX Constraint Contracts

### Community 174 - "grammar/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

## Knowledge Gaps
- **1096 isolated node(s):** `$schema`, `changelog`, `commit`, `access`, `baseBranch` (+1091 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1279 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Progress` connect `packages_core_dist_index` to `vitest`, `diff.ts`, `engine.ts`, `prompt.ts`, `tokens/src/model.ts`, `stream.test.ts`, `inline.ts`, `tools/src/index.ts`, `Task Breakdown — Markdown-UI DSL v2 Program`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `Task Breakdown — Markdown-UI DSL v2 Program` connect `Task Breakdown — Markdown-UI DSL v2 Program` to `Phase 2 — Tooling and design system`, `Phase 5 — Interop, docs and GA release`, `Phase 6 — 2.1 ecosystem`, `Phase 1 — Language core`, `README.md`, `Phase 3 — Agent integration, evals and the grammar pack`, `packages_core_dist_index`, `Phase 4 — Sync, verification and constraints (the novel features)`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `vitest` connect `vitest` to `engine.ts`, `Phase 1 — Language core`, `packages_core_dist_index_parse`, `ref_node_fs`, `schema.test.ts`, `package.json`, `compat.test.ts`, `build.ts`, `packages_core_dist_index`, `render.ts`, `analyze.ts`, `core/src/index.ts`, `stream.test.ts`, `analysis.ts`, `main.ts`, `frontmatter.ts`, `diff.ts`, `conformance.test.ts`, `export.test.ts`, `color.ts`, `cli/src/index.ts`, `tools/src/index.ts`, `traceability.ts`, `structural.test.ts`, `prompt.test.ts`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **What connects `$schema`, `changelog`, `commit` to the rest of the system?**
  _1096 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Implementation Plan — Markdown-UI DSL v2 Program` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `Competitive Research Catalogue — Markdown-UI DSL` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `engine.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09655172413793103 - nodes in this community are weakly interconnected._