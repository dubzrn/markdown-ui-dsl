# Graph Report - markdown-ui-dsl  (2026-10-01)

## Corpus Check
- 70 files · ~59,318 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 6, .ebnf 1)

## Summary
- 655 nodes · 740 edges · 48 communities (35 shown, 13 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d2f75949`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- skills.py
- Phase 2 — Tooling and design system
- Development Specification — Markdown-UI DSL v2 Program
- reference.sh
- Implementation Plan — Markdown-UI DSL v2 Program
- Competitive Research Catalogue — Markdown-UI DSL
- Locked-In Feature Additions — Markdown-UI DSL v2
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
- conformance-harness.mjs
- core/tsconfig.json
- spec/tsconfig.json
- spec/src/index.ts
- ADR-005-v1-ambiguity-decisions.md

## God Nodes (most connected - your core abstractions)
1. `Phase 1 — Language core` - 21 edges
2. `compilerOptions` - 19 edges
3. `Implementation Plan — Markdown-UI DSL v2 Program` - 16 edges
4. `Base` - 15 edges
5. `Phase 3 — Agent integration, evals and the grammar pack` - 15 edges
6. `Phase 4 — Sync, verification and constraints (the novel features)` - 15 edges
7. `Markdown UI DSL for AI Agents` - 14 edges
8. `Phase 2 — Tooling and design system` - 14 edges
9. `Development Specification — Markdown-UI DSL v2 Program` - 12 edges
10. `Phase 6 — 2.1 ecosystem` - 12 edges

## Surprising Connections (you probably didn't know these)
- `3.2 Tooling (TLS)` --references--> `parse()`  [INFERRED]
  docs/FEATURE_ADDITIONS.md → packages/core/src/parse.ts
- `T-030 · Lint engine completion` --references--> `TextEdit`  [INFERRED]
  docs/TASKS.md → packages/core/src/diagnostics.ts
- `4.1 Markdown- and text-native UI/wireframe languages — *direct competitors*` --references--> `main()`  [INFERRED]
  docs/COMPETITIVE_RESEARCH.md → scripts/reference-manifest.py
- `T-014 · Diagnostics model and code registry` --references--> `Span`  [INFERRED]
  docs/TASKS.md → packages/core/src/diagnostics.ts
- `T-014 · Diagnostics model and code registry` --references--> `TextEdit`  [INFERRED]
  docs/TASKS.md → packages/core/src/diagnostics.ts

## Import Cycles
- None detected.

## Communities (48 total, 13 thin omitted)

### Community 0 - "skills.py"
Cohesion: 0.06
Nodes (28): 4.1 Markdown- and text-native UI/wireframe languages — *direct competitors*, 4.2 Agent-to-UI protocols and generative-UI frameworks, 4.3 Design-system and design-token formats for agents, 4.4 Spec-driven development (SDD) and agent-instruction standards, 4.5 Verification foundations (not competitors — enablers), 4. Competitor catalogue, Conformance corpus, Fixture (+20 more)

### Community 1 - "Phase 2 — Tooling and design system"
Cohesion: 0.05
Nodes (44): Appendix A — Feature → task index, Conventions, Phase 0 — Foundations & hygiene, Phase 2 — Tooling and design system, Phase 5 — Interop, docs and GA release, Phase 6 — 2.1 ecosystem, Progress, T-001 · Fix example and documentation defects (+36 more)

### Community 2 - "Development Specification — Markdown-UI DSL v2 Program"
Cohesion: 0.07
Nodes (28): 0. Assumptions surfaced (confirm or correct before Phase 0 starts), 10. Risks (spec-level; schedule risks are in PLAN §8), 1.1 What and why, 1.2 Users, 1.3 Success (summary — full criteria in §9), 1. Objective, 2.1 Compatibility baseline (v1.0.3, unchanged), 2.2 DSL 2.0 additions (+20 more)

### Community 3 - "reference.sh"
Cohesion: 0.60
Nodes (5): detect_license(), die(), group_paths(), repo_of(), reference.sh script

### Community 4 - "Implementation Plan — Markdown-UI DSL v2 Program"
Cohesion: 0.07
Nodes (27): 10. Communication and migration plan, 11. Definition of ready (per task, before starting), 12. Immediate next actions, 13. Competitive-intelligence cadence, 14.1 Paths by group, 14.2 Consult-first paths by phase / task, 14.3 Highest-leverage lifts (where reference code removes the most work), 14.4 Not vendored (and where to look instead) (+19 more)

### Community 5 - "Competitive Research Catalogue — Markdown-UI DSL"
Cohesion: 0.12
Nodes (17): 1. Executive summary, 2.1 Approach, 2.2 Source quality tiers, 2.3 Limitations and how to read novelty claims, 2.4 Verification pass (rev. 2, same day), 2. Method, 3.1 Capabilities (what exists), 3.2 Defects and risks found in the repository itself (+9 more)

### Community 6 - "Locked-In Feature Additions — Markdown-UI DSL v2"
Cohesion: 0.09
Nodes (22): 10. Change log (rev. 2), 1. Design principles (non-negotiable constraints on every feature), 2. Priority and release key, 3.1 Language (LNG), 3.2 Tooling (TLS), 3.3 Design system & tokens (DSY), 3.4 Agent integration (AGT), 3.5 Quality & governance (QLT) (+14 more)

### Community 7 - "Markdown UI DSL for AI Agents"
Cohesion: 0.09
Nodes (22): 1. OpenClaw Hub (Recommended), 2. GitHub Copilot (Agent Mode), 3. Cursor / Roo Code / Cline, 4. Claude Code, 5. Gemini CLI, 6. GPT Codex (and other CLI agents), Components, Contributing (+14 more)

### Community 8 - "Phase 1 — Language core"
Cohesion: 0.10
Nodes (20): Phase 1 — Language core, T-006 · Reference-library hygiene and CI guards, T-010 · Normative grammar for v1.0.3, T-011 · Ambiguity and escaping decisions, T-012 · RFC-0001 — DSL 2.0 syntax, T-013 · Conformance corpus v1 and protocol, T-015 · Block parser, T-016 · Inline parser (v1 components) (+12 more)

### Community 9 - "📱 Responsive Design"
Cohesion: 0.12
Nodes (16): Advanced UI Elements, Breakpoints, Chat Interfaces (Gemini / Minimal AI Style), Colors, 🧩 Component Mappings, 🎨 Design Tokens, 📐 General Rule of Thumb, Generation Rule (+8 more)

### Community 10 - "README.md"
Cohesion: 0.05
Nodes (36): AGENTS.md — markdown-ui-dsl, Checks before you finish, Code map (graphify), Commands, Read first, Skills, Working agreements, Agent contributors (+28 more)

### Community 11 - "Phase 3 — Agent integration, evals and the grammar pack"
Cohesion: 0.13
Nodes (15): Phase 3 — Agent integration, evals and the grammar pack, T-050 · Component catalog schema and loader, T-051 · Catalog lint rules, T-052 · Component map, T-053 · Agent Skills restructure, T-054 · Prompt generator, T-055 · Safety hardening, T-056 · SDD interoperability (+7 more)

### Community 12 - "Agent skills — index, routing and vetting"
Cohesion: 0.15
Nodes (13): 1. Routing table — which skill for which work, 2. Project-local skills (32), 3.1 Vendored into the project (6), 3.2 Relevant but **not** vendored, 3.3 Proprietary — present but not redistributable, 3.4 Not relevant to this project, 3. Index of installed skills (authoring-environment snapshot, 110 skills), 4. How the 25 new skills were found (+5 more)

### Community 13 - "parse.ts"
Cohesion: 0.06
Nodes (50): T-014 · Diagnostics model and code registry, Base, BlockNode, CodeNode, CommentNode, ContainerKind, ContainerNode, DirectiveNode (+42 more)

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
Cohesion: 0.05
Nodes (38): ADR-0003, NODE_BUILTINS, devDependencies, ajv, @changesets/cli, eslint, @eslint/js, fast-check (+30 more)

### Community 30 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, declaration, exactOptionalPropertyTypes, ignoreDeprecations, isolatedModules, lib, module, moduleResolution (+11 more)

### Community 31 - "traceability.ts"
Cohesion: 0.24
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
Cohesion: 0.50
Nodes (3): ADR-004 — Frontmatter: bundled strict YAML subset, Decision, Why

### Community 40 - ".prettierrc.json"
Cohesion: 0.50
Nodes (3): printWidth, singleQuote, trailingComma

### Community 44 - "core/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 45 - "spec/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

## Knowledge Gaps
- **409 isolated node(s):** `$schema`, `changelog`, `commit`, `access`, `baseBranch` (+404 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 453 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Task Breakdown — Markdown-UI DSL v2 Program` connect `Phase 2 — Tooling and design system` to `Phase 1 — Language core`, `Phase 4 — Sync, verification and constraints (the novel features)`, `README.md`, `Phase 3 — Agent integration, evals and the grammar pack`?**
  _High betweenness centrality (0.182) - this node is a cross-community bridge._
- **Why does `Competitive Research Catalogue — Markdown-UI DSL` connect `Competitive Research Catalogue — Markdown-UI DSL` to `skills.py`, `README.md`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **Why does `Locked-In Feature Additions — Markdown-UI DSL v2` connect `Locked-In Feature Additions — Markdown-UI DSL v2` to `README.md`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **What connects `$schema`, `changelog`, `commit` to the rest of the system?**
  _409 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `skills.py` be split into smaller, more focused modules?**
  _Cohesion score 0.0596078431372549 - nodes in this community are weakly interconnected._
- **Should `Phase 2 — Tooling and design system` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._
- **Should `Development Specification — Markdown-UI DSL v2 Program` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._