# Competitive Research Catalogue — Markdown-UI DSL

| | |
|---|---|
| **Status** | Research complete — input to [`FEATURE_ADDITIONS.md`](FEATURE_ADDITIONS.md) |
| **Research date** | 2026-10-01 |
| **Subject** | `markdown-ui-dsl` v1.0.3 (`skills/markdown-ui-dsl/SKILL.md`) |
| **Scope** | Every system found that lets a human or an AI agent *describe a user interface as text or data* — Markdown-based or not — plus the adjacent tooling that decides whether such a description is adopted (design-system formats, agent-skill standards, spec-driven-development tools, verification tooling). |
| **Citation style** | `[S##]` → the [Source Register](#9-source-register) (direct URLs). Every factual claim about a third party carries a citation. |

---

## 1. Executive summary

**What the repo is today.** A single 76-line `SKILL.md` that teaches an agent a Markdown wireframe syntax (`||| COLUMN |||`, `=== ROW ===`, `::: CARD :::`, `[ text: … ]`, …), a YAML frontmatter convention (`framework`, `theme`, `component`), responsive `> @sm …` directives, and prose rules for two-way spec↔code sync. It has **no parser, no schema, no validator, no CLI, no preview, no tests** — it is entirely prompt text (see [§3](#3-baseline-audit-of-markdown-ui-dsl-v103)).

**What the market looks like (October 2026).** The category has moved fast since the repo's last commit:

1. **Agent-to-UI protocols are standardising.** Google's A2UI (declarative JSON + client-side component *catalog*) [S20], MCP Apps (first official MCP extension, co-developed by Anthropic and OpenAI) [S26][S27], AG-UI [S34], Open-JSON-UI [S37], Vercel's json-render (catalog + streaming spec, 18.4k★) [S38], and Flutter GenUI [S23] all converge on the same pattern: **an allow-listed catalog, a flat/streamable spec, a validated schema, and data binding**.
2. **"Design system as a Markdown file for agents" now has a standard.** Google open-sourced `DESIGN.md` (YAML tokens + prose rationale, with `lint`, `diff`, `export` commands) [S54], and the W3C Design Tokens Community Group shipped its first stable format (2025.10) [S60][S61].
3. **Markdown-native UI DSLs now exist as direct competitors** — wiremd [S01], BlueprintLab Markdown-UI [S04], mdocUI [S06] — and each already ships things this repo does not: a parser, an AST, renderers, a CLI or a streaming parser.
4. **Spec-driven development became a product category** — GitHub Spec Kit (139.6k★) [S81], OpenSpec (70.8k★) [S85], Kiro [S83], Tessl [S87] — and **Agent Skills** (`SKILL.md`) and **AGENTS.md** became cross-vendor open formats [S89][S90].

**Where `markdown-ui-dsl` is still distinctive.** None of the surveyed systems combines (a) a *human-first, lo-fi, plain-Markdown wireframe* with (b) a *design-system file* that governs generation, (c) a *two-way sync contract with code*, and (d) *framework-agnostic* output including non-web targets (Flutter, Blazor). That combination is the moat — but today it is protected only by prose.

**Headline gaps** (full list in [§6](#6-gap-analysis--decisions)): formal grammar and validation; machine-readable AST; tooling (CLI/lint/format/diff/preview); streaming; component catalog and prompt generation; design tokens with contrast linting; accessibility semantics; state/data model; multi-screen flows; MCP surface; conformance/eval suite; prompt-injection hardening; interoperability (A2UI, json-render, DESIGN.md, DTCG).

**White space for breakthrough features** ([§8](#8-novelty-analysis)). Four capabilities were searched for and **not found documented in any surveyed system** (bounded claim — see [§2.3](#23-limitations-and-how-to-read-novelty-claims)): node-anchored three-way spec↔code sync with a lockfile; spec-derived accessibility-tree conformance testing with a fidelity score; a catalog-aware constrained-decoding grammar pack for a Markdown UI DSL; and declarative UX-constraint contracts evaluated on wireframes before any code exists.

---

## 2. Method

### 2.1 Approach

1. Read the whole repository (`SKILL.md`, `README.md`, `TESTING.md`, 7 examples, 3 design-system files, issue templates).
2. Enumerated competitors in eight categories ([§4](#4-competitor-catalogue)) via ~60 web searches, then fetched primary sources (GitHub READMEs, official specs/docs) for the closest competitors to extract concrete features.
3. Built a capability matrix ([§5](#5-capability-matrix)) from **documented** features only.
4. Mapped each gap to evidence and a decision (adopt / adapt / reject) ([§6](#6-gap-analysis--decisions)).
5. Probed for white space by searching for each candidate novel feature against existing systems ([§8](#8-novelty-analysis)).

### 2.2 Source quality tiers

| Tier | Meaning | Examples |
|---|---|---|
| **T1** | Primary: official repo, spec, vendor documentation, peer-reviewed/preprint paper | `github.com/google/A2UI`, MCP spec, ACM papers |
| **T2** | Reputable secondary: engineering blog, trade press | InfoQ, Smashing Magazine, WorkOS |
| **T3** | Community/secondary: Medium/DEV posts, comparison blogs, marketplaces | used only to corroborate or for market colour, never as sole evidence for a technical claim |

Star counts, versions and pricing are **point-in-time snapshots from 2026-10-01** and will drift.

### 2.3 Limitations and how to read novelty claims

- **Blocked primary sites.** The research sandbox's egress proxy blocked `plantuml.com`, `mdocui.github.io`, `json-render.org`, `www.designtokens.org`, `playwright.dev` and `www.w3.org`. Claims about those systems rely on their GitHub repositories (fetched) or on search-result summaries and are marked in the register. Canonical URLs are still listed so reviewers can verify.
- **"Not documented" ≠ "does not exist".** In the matrix, `○` means *the capability was not documented in the sources reviewed*. Private roadmaps and undocumented behaviour are invisible to this method.
- **Novelty is bounded** to the search date and the systems surveyed. Section 8 states the nearest neighbour for every novel feature so a reader can challenge the claim.
- **Fast-moving field.** A2UI is pre-1.0 (v0.9.1, v1.0 release candidate) [S20]; mdocUI is alpha [S06]; wiremd is v0.1.5 [S01]; DESIGN.md is `alpha` [S54]. Interop work must pin versions.
- No competitor was *run* in this research; features are as documented.

---

## 3. Baseline audit of `markdown-ui-dsl` v1.0.3

### 3.1 Capabilities (what exists)

| Area | Present | Evidence |
|---|---|---|
| Layout primitives | `COLUMN`, `ROW`, `CARD`, `MODAL`, `HEADER`, `FOOTER`, `BUBBLE USER/AGENT`, `--- END ---`, `***` | `SKILL.md` L17–25 |
| Components | buttons, tabs, text input, checkbox, radio, toggle, dropdown (+`{dynamic: x}`), badge, image placeholder, lists, tables | `SKILL.md` L27–46 |
| Frontmatter | `framework`, `theme`, `component` | `SKILL.md` L48–57 |
| Responsive | `> @sm/@md/@lg/@xl token: value` mobile-first additive directives | `SKILL.md` L72–76 |
| Agent rules | spec→code, code→spec, drift resolution, `// UI Spec:` header, confirm-before-write | `SKILL.md` L59–76 |
| Design systems | 3 examples: Tailwind, Flutter Material, Blazor Bootstrap | `examples/design-systems/` |
| Distribution | OpenClaw Hub, Copilot, Cursor/Cline/Roo, Claude Code, Gemini CLI, Codex install snippets | `README.md` L29–84 |

### 3.2 Defects and risks found in the repository itself

| ID | Finding | Evidence | Severity |
|---|---|---|---|
| **B-01** | **4 of 7 shipped examples have unbalanced blocks.** `action-tracker-detail`, `action-tracker-master`, `chat-interface`, `mobile-app-layout` each have 2 more block openers than `--- END ---` closers; the files end with a stray `||| COLUMN |||` where the outer closer belongs. A simple opener/closer count over `examples/*.ui.md` shows `delta=2` for those four and `0` for the other three. | Scripted count during this research; `tail` of the two master/chat files | **High** — the reference examples are the few-shot material agents learn from, and no tool exists to catch it |
| **B-02** | README points to `examples/design-system.md`, which does not exist (the folder is `examples/design-systems/`); `TESTING.md` refers to a skill file named `markdown-ui-dsl.md`. | `README.md` L102, L139, L143; `TESTING.md` L15 | Medium |
| **B-03** | **Nesting ambiguity by design.** Every block type closes with the same token `--- END ---`, so an LLM (or human) must count depth to know what is being closed; `---` is also the YAML frontmatter fence. *(Hypothesis: this raises nesting-error rate for deep layouts. Not measured — T-063 (eval harness) records the baseline.)* | `SKILL.md` L24–25 | Medium |
| **B-04** | **Prompt-injection surface.** Blockquote hints "should be processed as part of the instruction set" (`SKILL.md` L71). A `.ui.md` file from an untrusted contributor can therefore carry instructions. Confirmation can be skipped by phrases like "force sync" (`SKILL.md` L64) — the phrase is meant to come from the *user*, but nothing distinguishes user turns from spec content. Compare A2UI's "data not code" stance [S20] and MCP Apps' mandatory sandboxing/CSP [S27]. | `SKILL.md` L64, L69–71 | **High** (for agent-marketplace distribution) |
| **B-05** | Sync is prose-only. Drift is "detected" by the model reading two files; the fallback is to *ask the user* which is the source of truth. No hashes, no node mapping, no merge. | `SKILL.md` L63–67 | Medium |
| **B-06** | Under-specified semantics: `{dynamic: users}`, meaning of `[ x ](#a)` vs route vs external URL, `[ text: 75% complete (progress bar) ]` (prose abuse of the text-input syntax in `mobile-app-layout`), what an unknown component should do. | `SKILL.md` L35, L29; `examples/mobile-app-layout.ui.md` | Medium |
| **B-07** | **No tests of any kind.** `TESTING.md` is a manual checklist and defers automation to "Future". | `TESTING.md` L5, L46–47 | High |
| **B-08** | No versioning of the language itself (version lives only in skill metadata), so generated specs cannot declare which grammar they target. | `SKILL.md` L7 | Medium |

---

## 4. Competitor catalogue

Legend for "Lesson": **ADOPT** (take as-is), **ADAPT** (take the idea, fit it to a Markdown-first model), **WATCH**, **REJECT** (with reason in [§6.2](#62-explicitly-rejected-or-deferred-ideas)).

### 4.1 Markdown- and text-native UI/wireframe languages — *direct competitors*

| System | What it is | Documented capabilities | Lesson for mdui | Src |
|---|---|---|---|---|
| **wiremd** (akonan) | "Text-first UI design tool" — wireframes in extended Markdown. MIT, v0.1.5, ~101★, 641+ tests. | Form syntax with inline attributes (`[____]{required}`, `{type:email required}`, `{.primary}`); `::: grid-N` layouts; **JSON AST**; HTML output in **7 visual styles** (sketch, clean, wireframe, tailwind, material, brutal, none); React/JSX/TSX and Tailwind export; **CLI with watch/live-reload**; **VS Code extension** with live preview; Obsidian plugin; Claude plugin; Figma plugin. | ADOPT: inline attribute syntax; ADAPT: AST + preview + CLI + editor extension. This is the closest rival and is ahead on tooling. | [S01][S02][S03] |
| **Markdown-UI** (BlueprintLab) | "Open standard for rendering interactive widgets in plain Markdown." MIT. | Fenced ```` ```markdown-ui-widget ```` blocks with one-line DSL (`text-input email "Email Address" …`); widgets: text-input, slider, button-group, select, select-multi, form, **chart-line/bar/pie/scatter**, multiple-choice/short-answer/quiz; React, Svelte, Vue renderers; degrades to readable Markdown. **Not documented:** streaming, sanitisation, state/action semantics. | ADAPT: chart/slider/quiz primitives; graceful-degradation principle. Note it targets *runtime widgets in chat*, not wireframe→code. | [S04][S05] |
| **mdocUI** | LLM-streamed inline UI using Markdoc `{% %}` tags. MIT, alpha, ~40★. | Streaming tokenizer/parser that buffers incomplete tags; component registry validated with Zod; **24 built-in components** (layout, interactive, data, content); `generatePrompt()` builds the system prompt from the registry; React renderer; Vue/Svelte/Solid on roadmap; CodeQL in CI. | ADOPT: prompt generation from registry; ADAPT: streaming parser. | [S06][S07][S19] |
| **Markdoc** (Stripe) | Markdown superset with typed custom tags and an AST. | Tag schemas declare attribute names/types, allowed children, custom `validate`; validation errors carry **severity levels** (debug/info/warning/error/critical); AST + transform + render pipeline. | ADOPT: schema-validated tags, severity model, "AST is the product" architecture. | [S08][S09][S10] |
| **MDX** | Markdown + JSX/imports/exports; compiled to JS. | Component imports/reuse across documents; every Markdown file is valid MDX. | ADAPT: partials/includes. REJECT: arbitrary JS in specs (safety, determinism). | [S11] |
| **PlantUML Salt** | Text wireframe sublanguage of PlantUML. | `@startsalt` blocks; buttons `[ ]`, radios `( )`, droplists `^`, input `"…"`, auto tables with `{`, scroll areas `{S`, spans; large ecosystem of embeds; **a Claude Code skill "PlantUML Salt Wireframer" already targets agents**. | WATCH: shows agent-driven text wireframing is already marketed; mdui's differentiators are Markdown-nativeness and code sync. | [S12][S13][S14] |
| **Balsamiq BMML / BMPR** | Wireframe tool; BMML was XML text, replaced by binary BMPR. | Moving from text (BMML) to binary (BMPR) "lost" Git-based workflows, per community accounts. | Cautionary: keep the source of truth diffable text. | [S15][S16] |
| **Mermaid** | Text-to-diagram in Markdown fences. | `architecture-beta`, `block` diagrams; rendered natively on GitHub/GitLab. No UI-wireframe diagram type appears in the pages reviewed. | ADAPT: native rendering in GitHub via a fence is a distribution channel (see TLS-10 PR wireframe diff). | [S17] |
| **llm-ui / streaming-Markdown renderers** | React libs rendering partial LLM Markdown. | Handle half-streamed constructs. | ADAPT: tests for partial input. | [S18][S19] |

### 4.2 Agent-to-UI protocols and generative-UI frameworks

| System | What it is | Documented capabilities | Lesson for mdui | Src |
|---|---|---|---|---|
| **A2UI** (Google) | Open protocol; agents emit declarative JSON describing UI intent; clients render with native components. Apache-2.0; v0.9.1, v1.0 RC. | **Client-owned component catalog** (agent can only request catalog components); **flat adjacency list with ID refs** for incremental LLM generation; data model + binding + events; progressive rendering; renderers for Lit, Flutter (GenUI), Angular, with React/Compose/SwiftUI planned; "trust ladders" for custom components. | ADOPT: catalog + trust levels. ADAPT: export `.ui.md` → A2UI JSON as an interop target. | [S20][S21][S22] |
| **Flutter GenUI** | Flutter SDK that renders A2UI from an agent. BSD-3, "highly experimental". | `CatalogItem` = name + data schema + builder; multiple catalogs; `genui_a2a` connector; JSON-schema validation package. | ADOPT: catalog-item shape (name/schema/builder ≈ mdui component-map). | [S23][S24][S25] |
| **MCP Apps** (SEP-1865) | First official MCP extension (Anthropic + OpenAI). Servers ship `ui://` HTML resources. | Predeclared `ui://` resources (prefetch/audit); **mandatory sandboxed iframes + declared CSP**; tool↔UI linkage via `_meta.ui.resourceUri` with `visibility: model/app`; JSON-RPC over `postMessage`; `ui/notifications/tool-input-partial` (streaming); **host-provided theming via standardised CSS variables** and `displayMode`; permission declarations; versioned spec (2026-01-26). | ADOPT: theme-variable vocabulary, explicit permission/trust declarations, versioned spec. WATCH: executable HTML is out of scope for wireframes. | [S26][S27][S28] |
| **MCP-UI** (Shopify/community) | Precursor to MCP Apps. | `UIResource`; HTML / external URL / **Remote-DOM** (host-native components from a sandboxed description). | WATCH. Remote-DOM confirms the "render with *host's own* components" principle. | [S29][S30][S31][S32][S33] |
| **AG-UI** (CopilotKit) | Event protocol between agent backends and frontends. | ~17 event types over SSE/WebSocket/HTTP; **bi-directional shared state** (read/write or read-only); frontend tools; generative-UI specs layer (A2UI, Open-JSON-UI, MCP Apps). | WATCH: transport, not description. Relevant to runtime-mode. | [S34][S35][S36][S110] |
| **Open-JSON-UI** | Open standardisation of OpenAI's internal declarative UI schema. | JSON "card" of typed components, rendered by frontend. | ADAPT: exporter target (low priority). | [S37] |
| **json-render** (Vercel Labs) | "AI → JSON → UI". Apache-2.0, 18.4k★ at fetch time, 25+ packages. | **Catalog** (Zod: components/actions/bindings) → **Spec** (flat JSON) → **Registry** (impl per platform); `catalog.prompt()` auto-generates the system prompt; **SpecStream** progressive compiler (JSON Patch / YAML streams); expressions `$state`, `$cond`, `$computed`; **15+ targets** (React, Vue, Svelte, Solid, React Native, PDF, Email, Remotion video, R3F, Ink terminal, images); **MCP Apps** integration; **Devtools** (spec tree, state editor, action log). | ADOPT: catalog→spec→registry layering, prompt-from-catalog, devtools-style inspector. REJECT: expression language in v2 (see §6.2). | [S38][S39] |
| **Adaptive Cards** (Microsoft) | Platform-agnostic card JSON. | **Templating** that separates layout from data; `Action.Execute` (verb + data); schema explorer; host-config theming; multi-host (Teams, Outlook). | ADOPT: verb/intent declaration for actions; separation of template vs data. | [S43][S44] |
| **Slack Block Kit** | JSON layout blocks for Slack. | **Block Kit Builder** live preview with real-time validation (missing props, wrong element for surface, block-count limits); `slack blocks preview` CLI; light/dark and mobile-width preview; an official **agent skill** for Block Kit. | ADAPT: validate-as-you-type + surface constraints + agent skill packaging. | [S51][S52] |
| **OpenAI ChatKit widgets / Apps SDK UI** | Widget JSON + component library for ChatGPT. | Widget node types (cards, lists, forms, text, buttons); **Widget Builder** studio; design-system guidelines; token-based UI kit. | WATCH: platform-specific. | [S40][S41][S42] |
| **Thesys C1 / Crayon** | Hosted "generative UI API" (OpenAI-compatible) + React SDK. | LLM returns UI spec; Crayon renders; theming; tool calling. | REJECT as dependency (hosted/proprietary); noted as demand signal. | [S45] |
| **Tambo / Hashbrown / Vercel AI SDK RSC** | React/Angular SDKs for generative UI. | Register components with Zod schemas (props become tool args); Hashbrown **Skillet** schema language + streaming JSON parser + UI kits; AI SDK `streamUI` (marked experimental). | ADAPT: schema→tool-definition idea (catalog → MCP tool). | [S46][S47][S48][S49][S50] |
| **Airbnb Ghost Platform (SDUI)** | Server-driven UI across web/iOS/Android. | **Sections** (cohesive data groups) + **screens** (layout with *placements*); one backend response drives all clients; actions in the response. | ADAPT: screen/section separation maps to mdui screens + partials. | [S53] |

### 4.3 Design-system and design-token formats for agents

| System | What it is | Documented capabilities | Lesson for mdui | Src |
|---|---|---|---|---|
| **DESIGN.md** (Google Stitch, open-sourced Apr 2026) | Plain-text design system for agents. Apache-2.0, `alpha`. | YAML front matter of tokens (colors, typography, rounded, spacing, components) + 8 ordered prose sections (Overview … Do's and Don'ts); token refs `{colors.primary}`; **CLI `lint` with 11 rules** (broken-ref = error; **WCAG-AA contrast ≥ 4.5:1** on component pairs; orphaned tokens; section-order …); **`diff`** with regression detection; **`export`** to Tailwind v3 JSON, Tailwind v4 CSS `@theme`, and **DTCG**. Adopted by "six or more agents". | **ADOPT as first-class `theme:` target** rather than inventing a rival; copy lint/diff/export command shape. | [S54][S55][S56][S57] |
| **W3C DTCG Format Module 2025.10** | First stable vendor-neutral design-token JSON. | Tokens with `$value`/`$type`; aliases; modern colour (Display-P3, Oklch…); theming/multi-brand; backed by 24–40+ organisations (Adobe, Google, Microsoft, Figma, Shopify, Penpot…). Community Group report — **not** on the W3C standards track. | ADOPT as token interchange. | [S60][S61][S62] |
| **Style Dictionary / Tokens Studio** | Token build pipeline (Amazon) / token authoring in Figma. | Transform tokens to CSS vars, Swift, Android XML; DTCG as exchange. | ADAPT: reuse for DSY exporters rather than rebuild. | [S63][S64] |
| **v0 registries** | shadcn-style registries consumed by v0, Cursor, Windsurf (MCP). | Branded components/blocks in model-consumable form. | ADAPT: catalog → registry bridge. | [S74][S75] |
| **Storybook MCP / manifests** | Component manifests for agents. | Machine-readable props/stories/docs; agents discover components via tools and self-test. | ADAPT: consume manifests to auto-populate the component catalog. | [S72] |
| **Figma MCP + Code Connect** | Design context for coding agents. | `get_design_context`, `get_metadata`, `get_screenshot`; Code Connect maps design components to code; "design system rules" file generation; remote server. | ADAPT: Code-Connect-style mapping file (`mdui.map.yaml`); WATCH for Figma→DSL importer. | [S65][S66][S67] |
| **Penpot / pen.dev (.pen)** | Open-source design platform with MCP; JSON design files in-repo with headless CLI. | Native design tokens; MCP tools; `.pen` JSON tracked in Git. | WATCH: potential import/export partners. | [S68][S69][S70][S71] |
| **Google Stitch** | AI UI design tool (Mar 2026 major update). | Infinite canvas, design agent, multi-screen prototyping, MCP server + SDK, code export (HTML/CSS, Tailwind, Vue, Angular, Flutter, SwiftUI), DESIGN.md. | WATCH: validates demand for multi-screen + portable design rules. | [S58][S59] |
| **Mitosis** (Builder.io) | Write once in `.lite.tsx`, compile to React/Vue/Svelte/Angular/Qwik/Solid/RN. | JSX-subset IR compiled by per-framework generators. | WATCH: alternative codegen backend. | [S76] |
| **Locofy / Anima / Visual Copilot** | Figma→code. | **Map design components to your repo's components**; multi-framework. | ADAPT: reinforces component-map. | [S77] |
| **Uizard / Visily** | AI wireframe tools. | Text→multi-screen wireframes; screenshot/sketch import. | WATCH: lo-fi market is crowded in GUI tools, thin in diffable text. | [S78] |
| **IFML (OMG)** | Standard for modelling front-end *interaction flow*. | Platform-independent view containers, events, navigation flows (visual notation). | ADAPT: flow model without the heavy notation. | [S80] |
| **Streamlit / Gradio** | Python-code-as-UI. | UI defined imperatively/declaratively in code. | REJECT: not a spec format. | [S79] |

### 4.4 Spec-driven development (SDD) and agent-instruction standards

| System | What it is | Documented capabilities | Lesson for mdui | Src |
|---|---|---|---|---|
| **GitHub Spec Kit** | SDD toolkit. MIT, 139.6k★. | `/constitution → /specify → /clarify → /plan → /tasks → /analyze → /implement`; project **constitution**; extensions/presets/bundles; many agents. | ADAPT: make `.ui.md` the *UI artefact* inside Spec Kit flows; provide templates. | [S81][S82] |
| **Kiro** (AWS) | Agentic IDE with specs. | Requirements → Design → Tasks; **EARS** acceptance criteria ("WHEN … THE SYSTEM SHALL …"). | ADOPT: EARS for requirement IDs referenced from specs. | [S83][S84] |
| **OpenSpec** | Delta-based SDD. MIT, 70.8k★, 30+ agents. | `specs/` (truth) vs `changes/` (proposals); **ADDED/MODIFIED/REMOVED deltas**; propose→apply→archive; scenario format (WHEN … THEN …). | ADAPT: delta vocabulary for `mdui diff`. | [S85][S86] |
| **Tessl** | Spec-as-source + registry. | Specs as durable truth; **drift detection and reconciliation**; versioned spec registry (10k+ specs). | ADAPT: drift concept → NOV-01 lockfile (but at UI-node granularity). | [S87][S88] |
| **Agent Skills** (`SKILL.md`) | Open standard (Dec 2025) for agent capabilities; 20+ platforms. | Directory with `SKILL.md` (YAML `name`, `description`) + optional `scripts/ references/ assets/`; name ≤ 64 chars matching folder; description ≤ 1,024 chars; progressive disclosure. | ADOPT: restructure repo skill to the standard and validate it. | [S89][S92] |
| **AGENTS.md** | "README for agents"; Linux Foundation (AAIF) stewardship. | Read natively by Codex, Cursor, Copilot, Gemini CLI, Windsurf, Zed, … | ADOPT: ship an `AGENTS.md` (for contributors) and an `AGENTS.md` snippet (for users). Note a study questions blanket benefit of context files — review before over-investing [S111]. | [S90][S91][S111] |

### 4.5 Verification foundations (not competitors — enablers)

| Technology | Documented capability | Why it matters here | Src |
|---|---|---|---|
| **axe-core** | Rules engine; ~57% of WCAG issues found on average; deliberately avoids false positives; WCAG 2.0/2.1/2.2. | Baseline a11y verification; rules ≠ semantic conformance to a *spec*. | [S93][S94] |
| **WCAG 2.2** | Adds 2.5.8 Target Size (Minimum) 24×24 CSS px, Focus Appearance (AAA), 3.3.8 Accessible Authentication. | Targets for a11y lint attributes and constraints. | [S95] *(canonical: w3.org/TR/WCAG22 — unreachable from sandbox)* |
| **Playwright ARIA snapshots** | `toMatchAriaSnapshot()` compares the browser accessibility tree (roles, names, states) to a YAML template; stable under cosmetic change. | Natural *oracle target* for compiled wireframes (NOV-02). | [S96][S97] |
| **Flutter semantics testing** | `SemanticsController`, `meetsGuideline` (tap-target 44/48, labelled targets). | Non-web oracle adapter. | [S98][S99] |
| **Chromatic** | Pixel snapshot baselines for Storybook. | Contrast case: pixel diff is wrong tool for lo-fi spec conformance. | [S73] |
| **Constrained decoding** (llguidance, XGrammar, llama.cpp GBNF, OpenAI custom-tool CFG) | Token-level masking enforces a CFG/regex/JSON-schema; llguidance ≈50 µs/token and powers OpenAI/vLLM/SGLang/llama.cpp integrations; OpenAI GPT-5 custom tools accept Lark/regex grammars; research on *decode-time grammars* eliminates invalid references by construction. | Makes "valid DSL by construction" feasible (NOV-03). | [S100][S101][S102][S103][S104] |
| **Research on LLM-generated UI accessibility** | 84% of ChatGPT-generated sites showed accessibility problems (text resizing, contrast, semantics); a11y-oriented prompting helps but semantic gaps persist; CodeA11y studies assistants. | Evidence that *verification* (not just generation) is needed. | [S105][S106][S107] |
| **Nielsen heuristics** | 10 usability heuristics (error prevention, recognition vs recall, consistency, …). | Taxonomy for UX constraint contracts (NOV-04). | [S108] |
| **promptfoo** | YAML eval configs with deterministic + model-graded assertions, CI thresholds. | Fits the "structural evaluation" strategy already stated in `TESTING.md`. | [S109] |

---

## 5. Capability matrix

`●` documented · `◐` partial/indirect · `○` not documented in reviewed sources (not proof of absence). "mdui" = this repo at v1.0.3.

| Capability | mdui | wiremd | Markdown-UI | mdocUI | Salt | Markdoc | A2UI | json-render | MCP Apps | DESIGN.md |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Plain-text / Markdown-native source | ● | ● | ● | ● | ◐ | ● | ○ | ○ | ○ | ● |
| Formal grammar / schema validation | ○ | ○ | ○ | ● | ○ | ● | ● | ● | ◐ | ◐ |
| Machine-readable AST / IR | ○ | ● | ◐ | ● | ○ | ● | ● | ● | ○ | ◐ |
| CLI (lint / format / export) | ○ | ● | ○ | ○ | ◐ | ○ | ○ | ○ | ○ | ● |
| Live preview / renderer | ○ | ● | ● | ● | ● | ◐ | ● | ● | ● | ○ |
| Streaming / incremental parse | ○ | ○ | ○ | ● | ○ | ○ | ● | ● | ● | ○ |
| Component allow-list / catalog | ○ | ○ | ◐ | ● | ○ | ● | ● | ● | ◐ | ○ |
| Data binding / state | ◐ | ○ | ◐ | ○ | ○ | ◐ | ● | ● | ◐ | ○ |
| Design tokens | ◐ | ◐ | ○ | ○ | ○ | ○ | ○ | ○ | ◐ | ● |
| Accessibility checks | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ◐ |
| Multi-framework output | ◐ | ● | ◐ | ◐ | ○ | ◐ | ● | ● | ○ | ◐ |
| Two-way spec↔code sync / drift | ◐ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| MCP / agent tool surface | ○ | ◐ | ○ | ○ | ◐ | ○ | ○ | ● | ● | ○ |
| Prompt generation from schema | ○ | ○ | ○ | ● | ○ | ○ | ◐ | ● | ○ | ○ |
| Multi-screen flows | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| Language versioning / governance | ○ | ◐ | ○ | ◐ | ○ | ◐ | ● | ◐ | ● | ◐ |

**Reading the matrix.** (1) mdui is behind on every *tooling* row; (2) it is the only row-leader (even if partially) on *two-way sync* — and that is the weakest-implemented thing on the list, so it is simultaneously the moat and the biggest liability; (3) **no surveyed system documents accessibility verification of the generated UI against its own spec**, nor **multi-screen flows in a text-native format**; (4) the strongest protocols (A2UI, json-render) are *JSON-first*, leaving the human-readable authoring layer open.

Row evidence is in the corresponding §4 cards. Notable judgement calls: Salt "CLI ◐" and "MCP ◐" derive from the marketed Claude skill [S14] and PlantUML's tooling ecosystem, not from Salt itself; wiremd "MCP ◐" derives from its Claude plugin [S01]; MCP Apps "tokens ◐" refers to host-provided CSS variables [S27].

---

## 6. Gap analysis → decisions

### 6.1 Gaps, evidence and decision

Feature IDs are defined in [`FEATURE_ADDITIONS.md`](FEATURE_ADDITIONS.md).

| # | Gap in mdui v1.0.3 | Competitive evidence | Decision | Feature(s) |
|---|---|---|---|---|
| G1 | No formal grammar; ambiguous closers; unbalanced examples (B-01, B-03) | Markdoc/A2UI/json-render all ship schemas [S09][S20][S38] | **ADOPT** grammar + typed closers + escaping | LNG-01, LNG-02, LNG-09 |
| G2 | No AST/IR | wiremd JSON AST [S01]; mdocUI AST [S06]; Markdoc AST [S08] | **ADOPT** | TLS-01 |
| G3 | No CLI/lint/format/diff | DESIGN.md `lint/diff/export` [S54]; wiremd CLI [S01]; OpenSpec deltas [S86] | **ADOPT** | TLS-02…05 |
| G4 | No preview/renderer | wiremd 7 styles + live-reload [S01]; Block Kit Builder [S51]; Salt [S12] | **ADOPT** | TLS-06, TLS-09 |
| G5 | No streaming | mdocUI [S06]; json-render SpecStream [S38]; MCP Apps partial input [S27] | **ADAPT** | TLS-07 |
| G6 | No component catalog / trust model | A2UI catalog + trust ladders [S20]; GenUI `CatalogItem` [S24]; json-render catalog [S38] | **ADOPT** | DSY-04, DSY-06 |
| G7 | No prompt generation | json-render `catalog.prompt()` [S38]; mdocUI `generatePrompt()` [S06] | **ADOPT** | AGT-02 |
| G8 | Design-system format is ad hoc prose | DESIGN.md [S54]; DTCG [S60]; Style Dictionary [S63] | **ADOPT** (interop, don't fork) | DSY-01…03 |
| G9 | No accessibility semantics or checks | LLM a11y research [S105][S107]; WCAG 2.2 [S95]; DESIGN.md contrast lint [S54] | **ADOPT** + extend (NOV-02) | QLT-03, NOV-02 |
| G10 | Data/state under-specified (`{dynamic: x}`) | A2UI data model [S20]; json-render `$state` [S38]; Adaptive Cards templating [S44] | **ADAPT** — *paths only, no expressions* | LNG-06 |
| G11 | No UI states (loading/empty/error) | Storybook/stories concept [S72]; Block Kit surface validation [S51] | **ADAPT** | LNG-05 |
| G12 | No multi-screen flows | Stitch multi-screen [S58]; IFML [S80]; Airbnb screens [S53]; Uizard [S78] | **ADAPT** (text-native) | LNG-08 |
| G13 | No reuse (partials/components) | MDX imports [S11]; Airbnb sections [S53]; Mitosis [S76] | **ADAPT** | LNG-07 |
| G14 | Small primitive set | mdocUI 24 components [S06]; Markdown-UI charts/sliders [S04]; wiremd grid [S01] | **ADAPT** | LNG-04 |
| G15 | No field attributes (required/type/validation) | wiremd `{required type:email}` [S01] | **ADOPT** | LNG-03 |
| G16 | No MCP surface | Figma MCP [S65]; Storybook MCP [S72]; Penpot [S69]; pen.dev [S70] | **ADOPT** | TLS-08 |
| G17 | Prose-only sync | Tessl drift [S87]; Code Connect mapping [S65] | **ADAPT → breakthrough** | NOV-01 |
| G18 | No tests / evals (B-07) | promptfoo [S109]; wiremd 641 tests [S01] | **ADOPT** | QLT-01, QLT-02 |
| G19 | Skill not in Agent Skills layout; no AGENTS.md | Agent Skills [S89]; AGENTS.md [S90] | **ADOPT** | AGT-01 |
| G20 | Prompt-injection / unsafe sync (B-04) | A2UI security model [S20]; MCP Apps CSP/permissions [S27] | **ADOPT** | AGT-04 |
| G21 | No SDD integration | Spec Kit [S81]; Kiro EARS [S84]; OpenSpec [S86] | **ADAPT** | AGT-03 |
| G22 | Closed ecosystem (no export to protocols) | A2UI [S20]; json-render [S38]; Open-JSON-UI [S37]; Adaptive Cards [S43]; Block Kit [S51] | **ADAPT** (exporters) | AGT-05 |
| G23 | No dark/print/contrast/motion variants | MCP Apps `theme` host context [S27]; DTCG theming [S60] | **ADAPT** (reuse `@` directive syntax) | LNG-13 |
| G24 | No i18n / RTL hints | **No competitor evidence** — none of the surveyed lo-fi DSLs documents i18n. Included on first-principles grounds (string-length and RTL layout risk) and kept deliberately light; lowest-priority "Could". | **ADAPT** (light) | LNG-12 |
| G25 | No importers | Figma MCP [S65]; pen.dev [S70]; screenshot→wireframe in Visily [S78] | **WATCH → Could** | TLS-11 |

### 6.2 Explicitly rejected or deferred ideas

| Idea | Seen in | Why not |
|---|---|---|
| JSON-only authoring | A2UI, json-render, Open-JSON-UI | Poor human readability and review; mdui's value is human-first. **Export** to these instead. |
| Executable HTML/JS payloads | MCP Apps, MCP-UI | A wireframe is not a runtime artefact. Borrow their *sandbox/CSP thinking* for the runtime-mode feature only. |
| Expression languages in bindings (`$cond`, `$computed`, JS in MDX) | json-render, MDX | Breaks determinism and widens injection surface. v2 allows **paths only**. |
| Proprietary/binary spec formats | Balsamiq BMPR, Figma | Defeats diff/review. |
| Pixel-diff verification | Chromatic | Wrong abstraction for lo-fi conformance; replaced by semantic oracle. |
| Hosted generative-UI API dependency | Thesys C1 | Vendor lock-in; mdui must stay offline-capable. |
| Hi-fi visual editing | Figma, Penpot, Stitch | Non-goal; stays a spec layer. Partner via importers/exporters. |
| Own token format | — | DESIGN.md + DTCG already exist; forking adds cost with no benefit. |

---

## 7. Positioning

```
                     Human-readable authoring
                              ▲
             Salt   wiremd    │   Markdown-UI   mdocUI
                       ┌──────┼──────────────────┐
                       │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓    │   ← mdui target:
         Balsamiq ─────┤   ▓ markdown-ui-dsl ▓   │     human-first spec
                       │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓    │     + verified code sync
                       └──────┼──────────────────┘     + protocol exporters
   Design-time ◄──────────────┼──────────────► Run-time (agent→user)
   (wireframe → code)         │                (generative UI)
                    DESIGN.md │  A2UI   json-render   MCP Apps
                              ▼
                     Machine-first protocol
```

**Strategic stance.** *Be the human-readable, diffable, verifiable authoring layer that compiles into the machine protocols* (A2UI, json-render, Adaptive Cards, Block Kit) and consumes the machine design-system formats (DESIGN.md, DTCG). Do not compete as a runtime protocol.

---

## 8. Novelty analysis

For each candidate: what it is, the **nearest neighbour found**, and why it is still treated as new. Claims are bounded per [§2.3](#23-limitations-and-how-to-read-novelty-claims).

| ID | Candidate | Nearest neighbours | Why it appears to be white space |
|---|---|---|---|
| **NOV-01** | **Anchored three-way sync** — stable per-node anchors in spec *and* generated code, plus a lockfile recording the last-synced spec AST; sync becomes a node-level three-way merge (base / spec / code) with conflict classes, replacing "ask the user which file is the source of truth". | Tessl drift detection/reconciliation at *spec-file* level [S87]; Figma Code Connect mappings at *component* level [S65]; OpenSpec deltas at *requirement* level [S86]. | None documented operate on UI *layout nodes* nor use a three-way base. |
| **NOV-02** | **Spec Oracle** — compile the wireframe AST into expected **accessibility-tree** assertions (Playwright ARIA snapshot / Flutter semantics), run them against the generated app, and report a per-node **Fidelity Score** mapped back to spec lines. Pixel-free, framework-neutral, and also checks a11y. | Playwright ARIA snapshots are hand-written [S96][S97]; axe is rule-based, not spec-aware [S93]; Chromatic is pixel-based [S73]; Flutter `meetsGuideline` is rule-based [S98]. | No surveyed system *derives* the expected tree from a wireframe spec. Research shows LLM UI code is accessibility-poor [S105][S107], so verifying it against the spec has clear demand. |
| **NOV-03** | **Valid-by-construction grammar pack** — emit Lark / GBNF / JSON-Schema from the DSL grammar **and the project's catalog + tokens + data keys**, so a constrained-decoding engine can only produce *valid, in-catalog, balanced* DSL. | json-render/A2UI constrain *JSON* via schemas [S20][S38]; OpenAI accepts Lark grammars for custom tools [S102]; llguidance/XGrammar make it fast [S100][S101]; decode-time-grammar research handles runtime-derived constraints [S103]. | No Markdown UI DSL (wiremd, Markdown-UI, mdocUI, Salt) documents a grammar for constrained decoding; none generates it from a project catalog. |
| **NOV-04** | **UX Constraint Contracts** — declarative, lintable UX heuristics (`max-primary-actions: 1`, `flow-depth ≤ 3`, `tap-target ≥ 44`, `form-fields ≤ 7`, `heading-order: strict`) evaluated on the *wireframe and flow graph* pre-code, and verified post-code through NOV-02. | DESIGN.md contrast lint is token-level [S54]; axe is post-code, DOM-level [S93]; Nielsen heuristics are guidance, not executable [S108]. | No surveyed system evaluates *flow-level* UX heuristics on a lo-fi spec before code exists. |

Each novel feature is specified in [`FEATURE_ADDITIONS.md`](FEATURE_ADDITIONS.md#5-novel--breakthrough-features) with a falsifiable success metric so the novelty claim can be tested rather than asserted.

---

## 9. Source register

Access date for all entries: **2026-10-01**. "Verified" = page fetched in-session; "Search" = surfaced in search results/snippet only; "Blocked" = canonical site not reachable from the research sandbox (listed for reviewer verification).

| ID | Tier | Verified | Title | URL |
|---|:-:|:-:|---|---|
| S01 | T1 | Verified | wiremd — text-first UI design tool (repo) | https://github.com/akonan/wiremd/ |
| S02 | T1 | Search | WireMD — Design UI Mockups with Markdown | https://wiremd.dev/ |
| S03 | T3 | Search | Show HN: WireMD | https://news.ycombinator.com/item?id=46033258 |
| S04 | T1 | Verified | BlueprintLabIO/markdown-ui | https://github.com/BlueprintLabIO/markdown-ui |
| S05 | T1 | Search | Markdown-UI site | https://markdown-ui.blueprintlab.io/ |
| S06 | T1 | Verified | mdocUI repository | https://github.com/mdocui/mdocui |
| S07 | T1 | Blocked | mdocUI documentation | https://mdocui.github.io/ |
| S08 | T1 | Search | Markdoc | https://markdoc.dev/ |
| S09 | T1 | Search | Markdoc — Validation | https://markdoc.dev/docs/validation |
| S10 | T1 | Search | Markdoc — Tags | https://markdoc.dev/docs/tags |
| S11 | T1 | Search | MDX — Markdown for the component era | https://mdxjs.com/ |
| S12 | T1 | Blocked | PlantUML — Salt (wireframe GUI) | https://plantuml.com/salt |
| S13 | T3 | Search | PlantUML Salt cheat sheet (gist) | https://gist.github.com/wonderstory/31b8b32a2843f3475398a377c41aee52 |
| S14 | T3 | Search | PlantUML Salt Wireframer — Claude Code skill | https://mcpmarket.com/tools/skills/plantuml-salt-wireframer |
| S15 | T1 | Search | Balsamiq — The BMPR file format | https://balsamiq.com/wireframes/desktop/docs/bmpr-format/ |
| S16 | T3 | Search | BMML file (FileInfo) | https://fileinfo.com/extension/bmml |
| S17 | T1 | Search | Mermaid — Architecture diagrams | https://mermaid.js.org/syntax/architecture.html |
| S18 | T2 | Search | Build interactive React UIs for LLM outputs using llm-ui (LogRocket) | https://blog.logrocket.com/react-llm-ui/ |
| S19 | T3 | Search | Why Markdoc for LLM Streaming UI (DEV) | https://dev.to/abhaygawade/why-markdoc-for-llm-streaming-ui-3m26 |
| S20 | T1 | Verified | A2UI (Google) | https://github.com/google/A2UI |
| S21 | T2 | Search | Google Introduces A2UI (MarkTechPost) | https://www.marktechpost.com/2025/12/22/google-introduces-a2ui-agent-to-user-interface-an-open-sourc-protocol-for-agent-driven-interfaces/ |
| S22 | T3 | Search | Introduction to A2UI | https://a2ui.sh/articles/introduction-to-a2ui |
| S23 | T1 | Verified | Generative UI SDK for Flutter (genui) | https://github.com/flutter/genui |
| S24 | T1 | Search | GenUI SDK main components and concepts | https://docs.flutter.dev/ai/genui/components |
| S25 | T1 | Search | New updates to A2UI and Flutter's GenUI package | https://flutter.dev/blog/new-updates-to-a2ui-and-flutters-genui-package |
| S26 | T1 | Search | SEP-1865: MCP Apps | https://modelcontextprotocol.io/seps/1865-mcp-apps-interactive-user-interfaces-for-mcp |
| S27 | T1 | Verified | MCP Apps specification 2026-01-26 | https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx |
| S28 | T1 | Search | MCP Apps: Extending servers with interactive user interfaces | https://blog.modelcontextprotocol.io/posts/2025-11-21-mcp-apps/ |
| S29 | T2 | Search | MCP UI: Breaking the text wall (Shopify Engineering) | https://shopify.engineering/mcp-ui-breaking-the-text-wall |
| S30 | T1 | Search | RemoteDOMResourceRenderer (mcp-ui docs) | https://mcpui.dev/guide/client/remote-dom-resource.html |
| S31 | T2 | Search | MCP-UI technical overview (WorkOS) | https://workos.com/blog/mcp-ui-a-technical-deep-dive-into-interactive-agent-interfaces |
| S32 | T2 | Search | Remote rendering: Shopify's take on extensible UI | https://shopify.engineering/remote-rendering-ui-extensibility |
| S33 | T1 | Search | Shopify/remote-dom core | https://github.com/Shopify/remote-dom/tree/main/packages/core |
| S34 | T1 | Search | AG-UI — State management | https://docs.ag-ui.com/concepts/state |
| S35 | T1 | Search | AG-UI — Generative UI specs | https://docs.ag-ui.com/concepts/generative-ui-specs |
| S36 | T2 | Search | The Developer's Guide to the AG-UI Protocol (CopilotKit) | https://www.copilotkit.ai/blog/developers-guide-to-the-ag-ui-protocol |
| S37 | T1 | Search | Open-JSON-UI (CopilotKit docs) | https://docs.copilotkit.ai/mastra/generative-ui/open-json-ui |
| S38 | T1 | Verified | vercel-labs/json-render | https://github.com/vercel-labs/json-render |
| S39 | T2 | Search | Vercel Releases JSON-Render (InfoQ) | https://www.infoq.com/news/2026/03/vercel-json-render/ |
| S40 | T1 | Search | ChatKit widgets (OpenAI) | https://developers.openai.com/api/docs/guides/chatkit-widgets |
| S41 | T1 | Search | Add UI to your MCP server (Apps SDK) | https://developers.openai.com/apps-sdk/plan/components |
| S42 | T1 | Search | UI guidelines (OpenAI) | https://developers.openai.com/plugins/concepts/ui-guidelines |
| S43 | T1 | Search | Action.Execute (Adaptive Cards) | https://learn.microsoft.com/en-us/adaptive-cards/schema-explorer/action-execute |
| S44 | T1 | Search | Templating SDKs (Adaptive Cards) | https://learn.microsoft.com/en-us/adaptive-cards/templating/sdk |
| S45 | T1 | Search | What is C1 by Thesys? | https://docs.thesys.dev/guides/what-is-thesys-c1 |
| S46 | T1 | Search | tambo-ai/tambo | https://github.com/tambo-ai/tambo |
| S47 | T1 | Search | Tambo — Generative Components | https://docs.tambo.co/concepts/generative-interfaces/generative-components |
| S48 | T1 | Search | Hashbrown | https://hashbrown.dev/ |
| S49 | T1 | Search | Introducing AI SDK 3.0 with Generative UI support | https://vercel.com/blog/ai-sdk-3-generative-ui |
| S50 | T1 | Search | ai-sdk-preview-rsc-genui | https://github.com/vercel-labs/ai-sdk-preview-rsc-genui |
| S51 | T1 | Search | `slack blocks preview` | https://docs.slack.dev/tools/slack-cli/reference/commands/slack_blocks_preview/ |
| S52 | T1 | Search | Slack Block Kit agent skill | https://github.com/slackapi/slack-skills-plugin/blob/main/skills/block-kit/SKILL.md |
| S53 | T2 | Search | A deep dive into Airbnb's server-driven UI system | https://medium.com/airbnb-engineering/a-deep-dive-into-airbnbs-server-driven-ui-system-842244c5f5 |
| S54 | T1 | Verified | google-labs-code/design.md | https://github.com/google-labs-code/design.md |
| S55 | T2 | Search | Google's open-source DESIGN.md (The Decoder) | https://the-decoder.com/googles-open-source-design-md-gives-ai-agents-a-prompt-ready-blueprint-for-brand-consistent-design/ |
| S56 | T3 | Search | awesome-design-md | https://github.com/VoltAgent/awesome-design-md/blob/main/README.md |
| S57 | T3 | Search | What is DESIGN.md / Google Stitch (MindStudio) | https://www.mindstudio.ai/blog/what-is-design-md-google-stitch |
| S58 | T3 | Search | Design Mobile App UI with Google Stitch (Codecademy) | https://www.codecademy.com/article/google-stitch-tutorial-ai-powered-ui-design-tool |
| S59 | T3 | Search | Google Stitch overview (ScriptByAI) | https://www.scriptbyai.com/google-stitch/ |
| S60 | T1 | Search | Design Tokens Format Module 2025.10 | https://w3c.github.io/cg-reports/design-tokens/CG-FINAL-format-20251028/ |
| S61 | T1 | Verified | design-tokens/community-group | https://github.com/design-tokens/community-group |
| S62 | T1 | Blocked | Design Tokens Community Group | https://www.designtokens.org/ |
| S63 | T1 | Search | style-dictionary/style-dictionary | https://github.com/style-dictionary/style-dictionary |
| S64 | T1 | Search | Tokens Studio — Style Dictionary + SD Transforms | https://docs.tokens.studio/transform-tokens/style-dictionary |
| S65 | T1 | Search | Figma MCP — Tools and prompts | https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/ |
| S66 | T1 | Search | Figma MCP — Add custom rules | https://developers.figma.com/docs/figma-mcp-server/add-custom-rules/ |
| S67 | T1 | Search | Guide to the Figma MCP server | https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server |
| S68 | T1 | Search | penpot/penpot | https://github.com/penpot/penpot |
| S69 | T2 | Search | Penpot experimenting with MCP servers (Smashing) | https://www.smashingmagazine.com/2026/01/penpot-experimenting-mcp-servers-ai-powered-design-workflows/ |
| S70 | T1 | Search | pen.dev CLI documentation | https://docs.pencil.dev/for-developers/pen-cli |
| S71 | T1 | Search | @pencil.dev/cli (npm) | https://www.npmjs.com/package/@pencil.dev/cli |
| S72 | T1 | Search | Storybook MCP server | https://storybook.js.org/docs/ai/mcp/overview |
| S73 | T1 | Search | Automate visual testing (Storybook handbook) | https://storybook.js.org/tutorials/visual-testing-handbook/react/en/automate/ |
| S74 | T1 | Search | v0 — Design Systems 2.0 | https://v0.app/docs/design-systems-2 |
| S75 | T1 | Search | AI-powered prototyping with design systems (Vercel) | https://vercel.com/blog/ai-powered-prototyping-with-design-systems |
| S76 | T1 | Search | BuilderIO/mitosis | https://github.com/BuilderIO/mitosis |
| S77 | T3 | Search | Figma to Code Tools Compared | https://www.snapflow.design/en/blog/figma-to-code-tools-compared |
| S78 | T3 | Search | Best AI Wireframing Tools 2026 | https://wireframingtools.org/best-ai-wireframing-tools/ |
| S79 | T3 | Search | Streamlit vs Gradio (UI Bakery) | https://uibakery.io/blog/streamlit-vs-gradio |
| S80 | T1 | Search | IFML — OMG | https://www.omg.org/ifml/ |
| S81 | T1 | Verified | github/spec-kit | https://github.com/github/spec-kit |
| S82 | T2 | Search | Exploring spec-driven development with GitHub Spec Kit (LogRocket) | https://blog.logrocket.com/github-spec-kit/ |
| S83 | T1 | Search | Kiro — Feature specs | https://kiro.dev/docs/specs/feature-specs/ |
| S84 | T1 | Search | Kiro — Requirements-first specs | https://kiro.dev/docs/specs/feature-specs/requirements-first/ |
| S85 | T1 | Verified | Fission-AI/OpenSpec | https://github.com/Fission-AI/OpenSpec |
| S86 | T1 | Search | OpenSpec — concepts | https://github.com/Fission-AI/OpenSpec/blob/main/docs/concepts.md |
| S87 | T1 | Search | Tessl — Concepts | https://docs.tessl.io/introduction-to-tessl/concepts |
| S88 | T1 | Search | Tessl launches spec-driven framework and registry | https://tessl.io/blog/tessl-launches-spec-driven-framework-and-registry |
| S89 | T1 | Search | Agent Skills specification *(URL as cited by S92; canonical site not fetched)* | https://agentskills.io/specification |
| S90 | T1 | Search | AGENTS.md | https://agents.md/ |
| S91 | T1 | Search | agentsmd/agents.md | https://github.com/agentsmd/agents.md |
| S92 | T3 | Search | Agent Skills Explained (Firecrawl) | https://www.firecrawl.dev/blog/agent-skills |
| S93 | T1 | Search | dequelabs/axe-core | https://github.com/dequelabs/axe-core |
| S94 | T2 | Search | Automated testing identifies 57% of digital accessibility issues (Deque) | https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues/ |
| S95 | T3 | Search | What's New in WCAG 2.2 (AudioEye) — canonical: https://www.w3.org/TR/WCAG22/ *(Blocked)* | https://www.audioeye.com/post/wcag-22/ |
| S96 | T3 | Search | How ARIA Snapshot Testing Solves Common Playwright Issues (DZone) | https://dzone.com/articles/aria-snapshot-testing-playwright |
| S97 | T2 | Search | Playwright docs mirror — Aria snapshots — canonical: https://playwright.dev/docs/aria-snapshots *(Blocked)* | https://docs.w3cub.com/playwright/aria-snapshots.html |
| S98 | T1 | Search | Flutter — Accessibility testing | https://docs.flutter.dev/ui/accessibility/accessibility-testing |
| S99 | T1 | Search | SemanticsController (flutter_test) | https://api.flutter.dev/flutter/flutter_test/SemanticsController-class.html |
| S100 | T1 | Verified | guidance-ai/llguidance | https://github.com/guidance-ai/llguidance |
| S101 | T1 | Search | XGrammar: Flexible and Efficient Structured Generation (arXiv 2411.15100) | https://arxiv.org/pdf/2411.15100 |
| S102 | T1 | Search | GPT-5 new params and tools — custom tools & CFG (OpenAI Cookbook) | https://cookbook.openai.com/examples/gpt-5/gpt-5_new_params_and_tools |
| S103 | T1 | Search | Decode-Time Grammars (arXiv 2607.18357) | https://arxiv.org/abs/2607.18357 |
| S104 | T1 | Search | Generating Structured Outputs from LMs: Benchmark and Studies (arXiv 2501.10868) | https://arxiv.org/html/2501.10868v1 |
| S105 | T1 | Search | Does ChatGPT Generate Accessible Code? (ACM) | https://dl.acm.org/doi/full/10.1145/3677846.3677854 |
| S106 | T1 | Search | CodeA11y: Making AI Coding Assistants Useful for Accessible Web Development (ACM) | https://dl.acm.org/doi/10.1145/3706598.3713335 |
| S107 | T1 | Search | When LLM-Generated Code Perpetuates UI Accessibility Barriers… (ACM) | https://dl.acm.org/doi/10.1145/3744257.3744266 |
| S108 | T1 | Search | 10 Usability Heuristics Applied to Complex Applications (NN/g) | https://www.nngroup.com/articles/usability-heuristics-complex-applications/ |
| S109 | T1 | Search | promptfoo — Command line | https://www.promptfoo.dev/docs/usage/command-line/ |
| S110 | T2 | Search | Master the 17 AG-UI Event Types (CopilotKit) | https://www.copilotkit.ai/blog/master-the-17-ag-ui-event-types-for-building-agents-the-right-way |
| S111 | T1 | Search | Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents? (arXiv 2602.11988) — *title only reviewed; findings to be read in T-053* | https://arxiv.org/pdf/2602.11988 |

**Not independently verified (flag for reviewers):** Anything marked "Search" rests on search-result summaries. Before a competitive claim is used externally (marketing, RFCs), re-check it at the URL.
