# Competitive Research Catalogue — Markdown-UI DSL

| | |
|---|---|
| **Status** | Research complete — input to [`FEATURE_ADDITIONS.md`](FEATURE_ADDITIONS.md) |
| **Research date** | 2026-10-01 · **rev. 2** — same-day verification pass (§2.4) |
| **Subject** | `markdown-ui-dsl` v1.0.3 (`skills/markdown-ui-dsl/SKILL.md`) |
| **Scope** | Every system found that lets a human or an AI agent *describe a user interface as text or data* — Markdown-based or not — plus the adjacent tooling that decides whether such a description is adopted (design-system formats, agent-skill standards, spec-driven-development tools, verification tooling). |
| **Citation style** | `[S##]` → the [Source Register](#9-source-register) (direct URLs). Every factual claim about a third party carries a citation. |

---

## 1. Executive summary

**What the repo is today.** A single 76-line `SKILL.md` that teaches an agent a Markdown wireframe syntax (`||| COLUMN |||`, `=== ROW ===`, `::: CARD :::`, `[ text: … ]`, …), a YAML frontmatter convention (`framework`, `theme`, `component`), responsive `> @sm …` directives, and prose rules for two-way spec↔code sync. It has **no parser, no schema, no validator, no CLI, no preview, no tests** — it is entirely prompt text (see [§3](#3-baseline-audit-of-markdown-ui-dsl-v103)).

**What the market looks like (October 2026).** The category has moved fast since the repo's last commit:

1. **Agent-to-UI protocols are standardising.** Google's A2UI (declarative JSON + client-side component *catalog*; the protocol document declares `v1.0`, released 2026-06-08, while the spec README still calls it "a candidate for becoming stable") [S112][S113], MCP Apps (stable spec 2026-01-26) [S27][S122], AG-UI [S124], Open-JSON-UI [S125], Vercel's json-render (catalog + streaming spec, 18.4k★ at fetch time) [S38], and Flutter GenUI [S23] all converge on the same pattern: **an allow-listed catalog, a flat/streamable spec, a validated schema, and data binding**.
2. **"Design system as a Markdown file for agents" now has a standard.** Google open-sourced `DESIGN.md` (YAML tokens + prose rationale, with `lint`, `diff`, `export` commands) [S54], and the W3C Design Tokens Community Group shipped its first stable format (2025.10) [S60][S61].
3. **Markdown- and text-native UI DSLs are now a crowded niche** — wiremd [S01], Wiremark [S117], Wireloom [S116], BlueprintLab Markdown-UI [S04], mdocUI [S06], ASCIIwire [S118] and PlantUML Salt [S12] — and several already ship what this repo lacks: a parser/AST, renderers (including SVG that displays inside GitHub), a CLI, streaming, an MCP server, even navigation flows.
4. **Spec-driven development became a product category** — GitHub Spec Kit (139.6k★) [S81], OpenSpec (70.8k★) [S85], Kiro [S83], Tessl [S87] — and **Agent Skills** (`SKILL.md`) and **AGENTS.md** became cross-vendor open formats [S89][S90].
5. **Token-efficient text DSLs for LLM UI are a competitive axis.** OpenUI Lang (MIT, 9.9k★) publishes **52.8% fewer tokens than Vercel JSON** across 7 scenarios [S115], and A2UI itself ships a compact ANTLR-defined text DSL, *Express* [S114]. This project has never measured its own token cost (TLS-12, spike SP-4).

**Where `markdown-ui-dsl` is still distinctive.** After verification, none of the surveyed systems documents the *combination* of (a) a *human-first Markdown wireframe*, (b) a *design-system file that governs generation*, (c) a *sync contract with code*, and (d) *framework-agnostic output including non-web targets* (Flutter, Blazor). Each rival covers one or two — Wiremark: flows + SVG; wiremd: styles + React export; Wireloom: GitHub-visible SVG + agent skill — but not all four. That combination remains the moat, and today it is protected only by prose.

**Headline gaps** (full list in [§6](#6-gap-analysis--decisions)): formal grammar and validation; machine-readable AST; tooling (CLI/lint/format/diff/preview); streaming; component catalog and prompt generation; design tokens with contrast linting; accessibility semantics; state/data model; multi-screen flows; MCP surface; conformance/eval suite; prompt-injection hardening; interoperability (A2UI, json-render, DESIGN.md, DTCG); Markdown-embeddable rendering; measured token efficiency.

**White space for breakthrough features** ([§8](#8-novelty-analysis), re-scoped in rev. 2). Four capabilities were searched for; each has *nearest prior art* that narrows — but does not close — the opening: (1) layout-node-granularity three-way spec↔code sync with a lockfile (prior art: UML round-trip engineering, VCS three-way merge, Code Connect); (2) spec-derived accessibility-tree conformance testing with a fidelity score (prior art: hand-written ARIA snapshots, visual/block-match benchmarks such as Design2Code, rule engines such as axe); (3) a catalog-specialised constrained-decoding grammar pack for a Markdown wireframe DSL (prior art: A2UI's `Express.g4`, OpenUI Lang, schema/CFG constraints in json-render and OpenAI custom tools); (4) flow-level UX-constraint contracts on lo-fi specs (prior art: token/DOM linters, Kiro's property-based checks of requirements). Claims are bounded per [§2.3](#23-limitations-and-how-to-read-novelty-claims).

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

- **Blocked primary sites.** The research sandbox allows page fetches essentially only from GitHub; docs and publisher sites (plantuml.com, markdoc.dev, mdxjs.com, modelcontextprotocol.io, openai.com, microsoft.com, figma.com, w3.org, arxiv.org, acm.org, …) are blocked, and per the environment's policy those blocks were **not** circumvented. Rev. 2 therefore verified claims against **GitHub-hosted primaries** where they exist and against a **user-supplied capture of plantuml.com/salt**; everything else is labelled `C` or `U` in the register.
- **"Not documented" ≠ "does not exist".** In the matrix, `○` means *the capability was not documented in the sources reviewed*. Private roadmaps and undocumented behaviour are invisible to this method.
- **Novelty is bounded** to the search date and the systems surveyed. Section 8 states the nearest neighbour for every novel feature so a reader can challenge the claim.
- **Fast-moving field.** A2UI's protocol document says v1.0 (2026-06-08) while its spec README still says "candidate for becoming stable" [S112][S113]; mdocUI is alpha [S06]; wiremd is v0.1.5 [S01]; DESIGN.md is `alpha` [S54]. Interop work must pin versions.
- No competitor was *run* in this research; features are as documented.

---

### 2.4 Verification pass (rev. 2, same day)

**Trigger.** The project owner supplied a full-page capture of `plantuml.com/salt` (the one blocked site they could provide) and asked that every source marked "Search" be verified.

**Method.** (1) Read the Salt capture in full (single tall page rendered at 170 dpi, cut into 10 slices and read in order; the last slice is a cookie banner). (2) For every register entry, attempted a direct fetch; the sandbox permits essentially only GitHub, so (3) each claim was re-checked against the **GitHub-hosted primary** (README, spec file, or docs folder) wherever one exists, with the specific numbers/phrases quoted back; (4) a further search round — seeded by curated lists such as [S121] — hunted for competitors missed in rev. 1.

**Status codes used in the register (§9):**

| Code | Meaning |
|:-:|---|
| **V** | Verified — this URL's content was fetched/read in-session and the cited claims checked |
| **V≈** | Verified via an equivalent primary named in the *Note* column (this URL itself is unreachable); caveats listed where the primary only partly confirms |
| **C** | Corroborated only — ≥ 2 independent search-result summaries agree; no primary reachable |
| **U** | Unverified — single search summary, title only, or unreachable |

**What the pass changed** (details in the cards and the matrix):
- **Corrected:** A2UI is `v1.0` (not "v0.9.1 / RC") with a different message set; AG-UI event count (~16 vs 17); Storybook MCP repo is archived/moved; Vercel AI SDK RSC reference repo is paused/archived; AGENTS.md stewardship and "60k projects" are unconfirmed; DESIGN.md "adopted by six or more agents" is a press claim; Style Dictionary's Amazon origin and DTCG support are not stated in its README; "co-developed by Anthropic and OpenAI" for MCP Apps is not stated in the repo; OpenSpec scenarios are GIVEN/WHEN/THEN.
- **Newly verified with exact numbers:** Agent Skills limits (500-line / < 5,000-token guidance), OpenAI custom-tool grammar syntaxes (Lark, regex), Playwright ARIA matching rules (order-sensitive, partial), WCAG 2.5.8 exceptions, axe-core's 57% and zero-false-positive claims, XGrammar's formats and default-backend status.
- **Retracted claim:** "no surveyed system documents multi-screen flows in a text-native format" — Wiremark (named frames, `to=#id`) and Salt (screens embedded in activity diagrams) do. LNG-08 stays, re-justified as parity-plus; the differentiator is flow-level *constraints* (NOV-04).
- **New competitors / prior art:** OpenUI Lang, Wiremark, Wireloom, ASCIIwire, A2UI *Express*, Claude Design, Superdesign/Onlook, Design2Code/WebAccessBench, round-trip engineering.
- **New gaps G26–G30** (§6.1) and **B-09/B-10** (§3.2).

**Result tally** — see the end of §9 (computed from the register).

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
| **B-09** | **Not embeddable/renderable in Markdown viewers.** Specs cannot be shown in a README, PR or Obsidian note; Wiremark, Wireloom and Mermaid all embed via a fence and/or SVG [S117][S116][S140]. | `SKILL.md` (no fence convention, no renderer) | Medium |
| **B-10** | **No token-efficiency evidence.** A competitor now publishes token benchmarks [S115]; this project's spec-vs-JSON cost has never been measured. | — | Medium |

---

## 4. Competitor catalogue

Legend for "Lesson": **ADOPT** (take as-is), **ADAPT** (take the idea, fit it to a Markdown-first model), **WATCH**, **REJECT** (with reason in [§6.2](#62-explicitly-rejected-or-deferred-ideas)).

### 4.1 Markdown- and text-native UI/wireframe languages — *direct competitors*

| System | What it is | Documented capabilities | Lesson for mdui | Src |
|---|---|---|---|---|
| **wiremd** (akonan) | "Text-first UI design tool" — wireframes in extended Markdown. MIT, v0.1.5, ~101★, 641+ tests. | Form syntax with inline attributes (`[____]{required}`, `{type:email required}`, `{.primary}`); `::: grid-N` layouts; **JSON AST**; HTML output in **7 visual styles** (sketch, clean, wireframe, tailwind, material, brutal, none); React/JSX/TSX and Tailwind export; **CLI with watch/live-reload**; **VS Code extension** with live preview; Obsidian plugin; Claude plugin; Figma plugin. | ADOPT: inline attribute syntax; ADAPT: AST + preview + CLI + editor extension. This is the closest rival and is ahead on tooling. | [S01][S02][S03] |
| **Wiremark** (Blackburn-Labs) | Text wireframing format that embeds in Markdown like Mermaid. 5★; licence not shown on the page reviewed. | Indentation = containment; MUI-like vocabulary (`Stack`, `Box`, `Card`, `Button`, `TextField`); **navigation flows** via named frames (`#id`) and links (`to=#id`); hand-drawn (Balsamiq-style) SVG; `@wiremark/core` (parser, layout engine, SVG renderer), CLI, host adapters (Obsidian, markdown-it, remark); separate PWA editor; "agent-first, low-ambiguity, low-token". | ADOPT: **fence + host adapters + SVG output** (→ TLS-13). **Correction to rev. 1:** text-native multi-screen flow is *not* unique to this plan. | [S117][S119] |
| **Wireloom** (Stardock) | Markdown extension turning indented text into SVG wireframes. v0.50, MIT, 58★. | Indent DSL (`window "Sign in":` → `panel:` → `input placeholder=…`); ~35 primitives incl. tree, menubar, breadcrumb, chip, avatar, mobile `sheet`/`backbutton`/`segmented`; **SVG renders in GitHub, Obsidian, Notion, static-site generators**; `npm install wireloom` with **zero runtime dependencies**; ships **`.claude/skills/wireloom.md` and `AGENTS.md`** for LLM authors. | ADOPT: zero-dep core, SVG-in-GitHub distribution (→ TLS-13), skill + AGENTS.md packaging (→ AGT-01). | [S116] |
| **ASCIIwire** | Text wireframe DSL (Markdown headings as layout/components) rendered to ASCII art. MIT; 0★, 10 commits (early). | Monorepo with parser, CLI, VS Code extension (in development) and an **MCP server**. | WATCH: parser+CLI+editor+MCP is the expected tool surface. | [S118] |
| **OpenUI Lang** (Thesys) | Compact, line-oriented, **streaming-first** language for model-generated UI plus runtimes. MIT, 9.9k★. | Typed component contracts via Zod; **system prompt generated from the allowed components**; runtimes for React, Vue, Svelte, Angular; published benchmark (`tiktoken` GPT-5 encoder, 7 scenarios): **52.8% fewer tokens than Vercel JSON** overall (10,180 → 4,800); contact form 294 vs 893 (json-render) and 849 (Thesys C1 JSON). Syntax examples and security notes were not visible in the README excerpt reviewed. | **Threat:** sets the bar for token efficiency; mdui must *measure* itself against it (→ TLS-12, SP-4). ADOPT: prompt-from-allowlist (AGT-02), streaming-first (TLS-07). | [S115][S151] (see also TokUI, another compact UI DSL — listing only [S150]) |
| **markdown-ui-dsl** (this project's upstream) | `MegaByteMark/markdown-ui-dsl`; this repository and at least one other public copy exist (fork status unconfirmed). | Upstream: 23★, 10 forks, 17 commits on `main`, 1 open PR, MIT [S120]; a Show HN post introduced it [S153, title only]. | Context: small community → governance question (upstream vs. fork) added to SPEC §0. | [S120][S153] |
| **Markdown-UI** (BlueprintLab) | "Open standard for rendering interactive widgets in plain Markdown." MIT. | Fenced ```` ```markdown-ui-widget ```` blocks with one-line DSL (`text-input email "Email Address" …`); widgets: text-input, slider, button-group, select, select-multi, form, **chart-line/bar/pie/scatter**, multiple-choice/short-answer/quiz; React, Svelte, Vue renderers; degrades to readable Markdown. **Not documented:** streaming, sanitisation, state/action semantics. | ADAPT: chart/slider/quiz primitives; graceful-degradation principle. Note it targets *runtime widgets in chat*, not wireframe→code. | [S04][S05] |
| **mdocUI** | LLM-streamed inline UI using Markdoc `{% %}` tags. MIT, alpha, ~40★. | Streaming tokenizer/parser that buffers incomplete tags; component registry validated with Zod; **24 built-in components** (layout, interactive, data, content); `generatePrompt()` builds the system prompt from the registry; React renderer; Vue/Svelte/Solid on roadmap; CodeQL in CI. | ADOPT: prompt generation from registry; ADAPT: streaming parser. | [S06][S07][S19] |
| **Markdoc** (Stripe) | Markdown superset with typed custom tags and an AST. MIT, 8.5k★ [S138]. | `{% %}` tags; schemas declare typed attributes and allowed children; `parse → transform → render` pipeline; validation errors carry **severity levels** (debug/info/warning/error/critical) *(from search-surfaced docs [S09]; not confirmed on the repo README)*. | ADOPT: schema-validated tags, severity model, "AST is the product" architecture. | [S08][S09][S10][S138] |
| **MDX** | Markdown + JSX/imports/exports; compiled to JS. | Component imports/reuse across documents; every Markdown file is valid MDX. | ADAPT: partials/includes. REJECT: arbitrary JS in specs (safety, determinism). | [S11][S139] |
| **PlantUML Salt** | Text wireframe sublanguage of PlantUML. **Verified against a full capture of the Salt page supplied by the project owner.** | `@startsalt` blocks; buttons `[ ]`, radios `( )`, checkboxes, text areas, droplists `^` (open/closed); **grids** with line modes `#`/`!`/`-`/`+`; **group box** `{^"title"`; **separators** (`..`, `==`, `~~`, `--`, titled); **tree** `{T` and **tree-table**; **tabs** `{/` (horizontal and vertical); **menu bars** `{*` incl. open menus; advanced tables (`*` span, `.` empty cell); **scrollbars** `{S`/`{SI`/`{S-`; inline **colours/disabled** states; **Creole/HTML** styling; **pseudo-sprites** `<<…>>`; **OpenIconic** icons `<&name>` (~200); `title`/`header`/`footer`/`caption`/`legend`; `scale`/`dpi` zoom; **embedding Salt screens inside activity diagrams** (`{{salt … }}`, including `while`/`repeat while` conditions), a basic screen-flow capability; **reuse via PlantUML macros** (`!procedure` + `%invoke_procedure`); a `!option handwritten true` sketch style; and `skinparam`/`<style>` theming that the page itself marks (FIXME notes) as only partly supported by Salt. **Not documented:** accessibility, state variants, data binding, schema/validation, framework codegen. A Claude Code skill for Salt is listed on a marketplace [S14, unverified]. | ADOPT ideas: `TREE`, `GROUP`, `MENUBAR`, scroll attribute, labelled separators, icon set, title/caption metadata, `--scale/--dpi`, screens-in-flow diagrams, macro-style reuse (→ LNG-07). **Opening:** Salt's own theming is flagged as partial, so a real token-driven theme is a differentiator. | [S12][S13][S14] |
| **Balsamiq BMML / BMPR** | Wireframe tool; BMML was XML text, later replaced by binary BMPR *(search-surfaced; unverified)*. | A community generator confirms a text→`.bmml` workflow exists [S142]; the XML-text nature of BMML and the loss of Git-friendliness on the move to BMPR rest on [S15][S16] (unverified). | Cautionary: keep the source of truth diffable text. | [S15][S16][S142] |
| **Mermaid** | Text-to-diagram in Markdown fences. | README lists "20+ diagram types" (flowchart, sequence, class, state, ER, Gantt, pie, git graph, mindmap, timeline, sankey, …); **no wireframe/UI-mockup type** [S140]; rendered natively on GitHub/GitLab. | ADAPT: native fence rendering is a distribution channel (→ TLS-13, TLS-10). | [S17][S140] |
| **llm-ui / streaming-Markdown renderers** | React libs rendering partial LLM Markdown. | Handle half-streamed constructs. | ADAPT: tests for partial input. | [S18][S19] |

### 4.2 Agent-to-UI protocols and generative-UI frameworks

| System | What it is | Documented capabilities | Lesson for mdui | Src |
|---|---|---|---|---|
| **A2UI** (Google) | Open protocol: agents emit declarative JSON describing UI intent; clients render with native components. Apache-2.0. Protocol doc: **`v1.0`, released 2026-06-08**; spec README: *"candidate for becoming stable"* [S112][S113]. | **Six agent→renderer messages:** `createSurface`, `updateComponents`, `updateDataModel`, `deleteSurface`, `callRendererFunction`, `agentFunctionResponse` (renderer→agent: `action`, `callAgentFunction`, `rendererFunctionResponse`, `error`); **catalog = JSON Schema** of components and functions (`catalogId`, UAX #31 names); **flat adjacency list** with `id` refs; **data binding via JSON Pointers (RFC 6901)**, `Dynamic*` types; actions carry event+context; **functions with `allowedCallers`** (`rendererOnly`/`agentOnly`/`rendererOrAgent`); A2A transport extension; renderers for Lit, Flutter (GenUI), Angular (React/Compose/SwiftUI planned) [S20]; plus an **ANTLR4 text DSL "Express"** — function-call syntax, `$/path` bindings, `?required` checks, designed for compact LLM output [S114]. | ADOPT: catalog + execution boundaries. **Pin exporters to the v1.0 message set**; map mdui `{{path}}` → JSON Pointer. Study Express as competitor *and* export target. | [S20][S21][S22][S112][S113][S114] |
| **Flutter GenUI** | Flutter SDK that renders A2UI from an agent. BSD-3, "highly experimental". | `CatalogItem` = name + data schema + builder; multiple catalogs; `genui_a2a` connector; JSON-schema validation package. | ADOPT: catalog-item shape (name/schema/builder ≈ mdui component-map). | [S23][S24][S25] |
| **MCP Apps** (SEP-1865) | First official MCP extension; stable spec **2026-01-26**. Servers ship `ui://` HTML resources. The `ext-apps` repo is maintained under the `modelcontextprotocol` org; hosts shown: ChatGPT, Claude, VS Code, Goose, Postman, MCPJam, mcp-use, Alpic [S122]. *("Co-developed by Anthropic and OpenAI" comes from search-surfaced articles; the repo page does not state authorship.)* | Predeclared `ui://` resources (prefetch/audit); **mandatory sandboxed iframes + declared CSP**; tool↔UI linkage via `_meta.ui.resourceUri` with `visibility: model/app`; JSON-RPC over `postMessage`; `ui/notifications/tool-input-partial` (streaming); **host-provided theming via standardised CSS variables** and `displayMode`; permission declarations [S27]. | ADOPT: theme-variable vocabulary, explicit permission/trust declarations, versioned spec. WATCH: executable HTML is out of scope for wireframes. | [S26][S27][S28][S122] |
| **MCP-UI** (community; Shopify among adopters) | Precursor to MCP Apps; Apache-2.0, 5.2k★; the `@mcp-ui/*` packages now implement the MCP Apps standard [S123]. | `UIResource` types `rawHtml`, `externalUrl`, `remoteDom`; TypeScript, Ruby and Python SDKs; hosts incl. Claude, Goose, LibreChat, Postman, MCPJam. | WATCH. Remote-DOM (MIT, 1.3k★ [S33]) confirms rendering with the *host's own* components. | [S29][S30][S31][S32][S33][S123] |
| **AG-UI** (CopilotKit) | Event protocol between agent backends and frontends. | **~16 standard event types** per the repo README (17 per a CopilotKit blog — counts differ by source); any transport (SSE, WebSockets, webhooks); bi-directional state sync (JSON-Patch detail not confirmed in the README); first-party integrations incl. LangChain, CrewAI, Microsoft Agent Framework, Google ADK, Mastra, Pydantic AI; positioned as the user-facing layer next to MCP (tools) and A2A (agents) [S124]. | WATCH: transport, not description. Relevant to runtime mode. | [S34][S35][S36][S110][S124] |
| **Open-JSON-UI** | Open standardisation of OpenAI's internal declarative UI schema. | JSON `"open-json-ui"` payload with a `spec.components[]` card tree [S125]. CopilotKit's taxonomy: **controlled** (own the layout; agent picks which), **declarative** (A2UI, Open-JSON-UI), **open-ended** (MCP Apps iframes) [S125]. | ADAPT: exporter target (low priority); adopt the taxonomy to position mdui (declarative, human-authored). | [S37][S125] |
| **json-render** (Vercel Labs) | "AI → JSON → UI". Apache-2.0, 18.4k★ at fetch time, 25+ packages. | **Catalog** (Zod: components/actions/bindings) → **Spec** (flat JSON) → **Registry** (impl per platform); `catalog.prompt()` auto-generates the system prompt; **SpecStream** progressive compiler (JSON Patch / YAML streams); expressions `$state`, `$cond`, `$computed`; **15+ targets** (React, Vue, Svelte, Solid, React Native, PDF, Email, Remotion video, R3F, Ink terminal, images); **MCP Apps** integration; **Devtools** (spec tree, state editor, action log). | ADOPT: catalog→spec→registry layering, prompt-from-catalog, devtools-style inspector. REJECT: expression language in v2 (see §6.2). | [S38][S39] |
| **Adaptive Cards** (Microsoft) | Platform-agnostic card JSON; schema v1.0→v1.6. | **Templating** separates layout from data; `Action.Execute` introduced in v1.4; hosts Teams, Outlook, Windows Timeline; renderers for JS, .NET, Android, iOS, C++/WinRT. The JS templating package's last release shown is **2022-09-16** (maintenance signal) [S126]. | ADOPT: verb/intent declaration for actions; layout/data separation. | [S43][S44][S126] |
| **Slack Block Kit** | JSON layout blocks for Slack. | **Block Kit Builder** live preview with real-time validation (missing props, wrong element for surface, block-count limits); `slack blocks preview` CLI; light/dark and mobile-width preview; an official **agent skill** for Block Kit. | ADAPT: validate-as-you-type + surface constraints + agent skill packaging. | [S51][S52] |
| **OpenAI ChatKit widgets / Apps SDK UI** | Widget JSON + component library for ChatGPT. | Widget node types (cards, lists, forms, text, buttons); **Widget Builder** studio; design-system guidelines; token-based UI kit. | WATCH: platform-specific. | [S40][S41][S42] |
| **Thesys C1 / Crayon** | Hosted "generative UI API" (OpenAI-compatible) + React SDK. | LLM returns a UI spec; Crayon renders; theming; tool calling *(vendor docs unreachable; unverified)* [S45]. Thesys' open-source artefact is OpenUI Lang (see §4.1). | REJECT as dependency (hosted/proprietary); track OpenUI instead. | [S45][S115] |
| **Tambo / Hashbrown / Vercel AI SDK RSC** | React/Angular SDKs for generative UI. | **Tambo:** MIT, 11.2k★; Zod-registered components; *generative* vs *interactable* components; MCP built in; hosted or self-hosted [S46]. **Hashbrown:** MIT, 725★; Skillet schemas + streaming JSON; React and Angular [S127]. **AI SDK `streamUI` (RSC):** the reference repo is **archived and development is paused** [S50]. | ADAPT: schema→tool-definition idea (catalog → MCP tool). Do not build on RSC. | [S46][S47][S48][S49][S50][S127] (assistant-ui offers an allow-list generative-UI primitive — listing only [S156]) |
| **Airbnb Ghost Platform (SDUI)** | Server-driven UI across web/iOS/Android. | **Sections** (cohesive data groups) + **screens** (layout with *placements*); one backend response drives all clients; actions in the response. | ADAPT: screen/section separation maps to mdui screens + partials. | [S53] |

### 4.3 Design-system and design-token formats for agents

| System | What it is | Documented capabilities | Lesson for mdui | Src |
|---|---|---|---|---|
| **DESIGN.md** (Google Stitch, open-sourced Apr 2026) | Plain-text design system for agents. Apache-2.0, spec version `alpha`. | YAML front matter of tokens (colors, typography, rounded, spacing, components with `backgroundColor`/`textColor`/`typography`/`rounded`/`padding`/`size`/`height`/`width`) + 8 ordered prose sections (Overview … Do's and Don'ts) [S143]; token refs `{colors.primary}`; **CLI `lint` (11 rules; broken-ref = error; WCAG-AA contrast ≥ 4.5:1 on component pairs; orphaned tokens; section order …)**, **`diff`**, **`export`** to Tailwind v3 JSON, Tailwind v4 `@theme`, **DTCG** [S54]. Spec says tokens convert to/from `tokens.json`, Figma variables and Tailwind configs [S143]. *Adoption by "six or more agents" is a press claim [S55] — the community collection of **73** brand DESIGN.md files itself calls adoption aspirational, with no usage numbers [S56].* | **ADOPT as first-class `theme:` target** rather than inventing a rival; copy lint/diff/export command shape. | [S54][S55][S56][S57][S143] |
| **W3C DTCG Format Module 2025.10** | First stable vendor-neutral design-token JSON per the report page. Community Group report — **not** on the W3C standards track. | Tokens with `$value`/`$type`; aliases; modern colour (Display-P3, Oklch…); theming/multi-brand. The repo lists three technical reports — **format, color, resolver** — and describes them as drafts-in-progress [S141]; backers include Adobe, Google, Microsoft, Figma, Shopify, Penpot, Tokens Studio [S61]. *(24 vs 40+ backers: counts differ by source.)* | ADOPT as token interchange; pin the Format Module version. | [S60][S61][S62][S141] |
| **Style Dictionary / Tokens Studio** | Token build pipeline / token authoring in Figma. Style Dictionary: Apache-2.0, 4.8k★ [S63]. | Platforms/transforms/formats model; **the README does not state Amazon origin or DTCG support, and the docs `reference/` listing shows no DTCG page** — both claims must be verified at T-038 before relying on them. | ADAPT: reuse for exporters *if* DTCG support is confirmed; else own DTCG exporter. | [S63][S64] |
| **v0 registries** | shadcn-style registries consumed by v0, Cursor, Windsurf (MCP). | Branded components/blocks in model-consumable form. | ADAPT: catalog → registry bridge. | [S74][S75] |
| **Storybook MCP / manifests** | Component manifests for agents. | Machine-readable props/stories/docs; tools such as `list-all-documentation`. **The standalone `storybookjs/mcp` repo was archived 2026-09-07 and moved into `storybookjs/storybook` (v10.6.0)**; `docs/ai` now holds `manifests`, `best-practices`, `agentic-review`, `mcp/` [S130]. | ADAPT: consume manifests to auto-populate the component catalog; track the new location. | [S72][S130] |
| **Figma MCP + Code Connect** | Design context for coding agents. | Tools `get_design_context` (React + Tailwind by default), `get_variable_defs`, `get_metadata`, `get_screenshot`; **remote server can write to the canvas**; clients: VS Code, Cursor, Claude Code, Gemini CLI [S128]. **Code Connect:** MIT, 1.6k★; React/RN, HTML (Web Components/Angular/Vue), SwiftUI, Compose, Storybook; mapping via template files; **requires an Organization/Enterprise plan with a full Design or Dev seat** [S129]. | ADAPT: Code-Connect-style mapping file (`mdui.map.yaml`); WATCH for a Figma→DSL importer. | [S65][S66][S67][S128][S129] |
| **Penpot / pen.dev (.pen)** | Open-source design platform with MCP; JSON design files in-repo with headless CLI (pen.dev: unverified). | Penpot: MPL-2.0, **60.6k★**; native design tokens; MCP server; open standards (SVG, CSS, HTML, JSON) [S68]. | WATCH: import/export partners. | [S68][S69][S70][S71] |
| **Google Stitch** | AI UI design tool (Mar 2026 major update). | Infinite canvas, design agent, multi-screen prototyping, MCP server + SDK, code export (HTML/CSS, Tailwind, Vue, Angular, Flutter, SwiftUI), DESIGN.md. | WATCH: validates demand for multi-screen + portable design rules. | [S58][S59] |
| **Claude Design** (Anthropic) | Prompt-to-prototype product launched 2026-04-17 (research preview) *(secondary sources only)*. | Reads a codebase/design files to extract a reusable design system; hands off design intent to Claude Code [S146]. | WATCH: a first-party agent-native design→code loop; mdui's open, diffable spec is the vendor-neutral counterpart. | [S146] |
| **Superdesign / Onlook** | AI design agents for developers *(secondary sources only)*. | Superdesign: open-source, IDE/agent skill, "6.5k★" per article; Onlook: visual editor on a real React codebase with Storybook design systems [S147][S157]. | WATCH. | [S147][S157] |
| **Mitosis** (Builder.io) | Write once, compile to React/Vue/Svelte/Angular/Qwik/Solid/RN. MIT, 14.4k★; README issues an explicit call for contributors [S76]. | Per-framework generators from a JSX-subset IR. | WATCH: alternative codegen backend; contributor call is a maintenance signal. | [S76] |
| **Locofy / Anima / Visual Copilot** | Figma→code. | **Map design components to your repo's components**; multi-framework. | ADAPT: reinforces component-map. | [S77] |
| **Uizard / Visily** | AI wireframe tools. | Text→multi-screen wireframes; screenshot/sketch import. | WATCH: lo-fi market is crowded in GUI tools, thin in diffable text. | [S78] |
| **IFML (OMG)** | Standard for modelling front-end *interaction flow*. | Platform-independent view containers, events, navigation flows (visual notation). | ADAPT: flow model without the heavy notation. | [S80] |
| **Streamlit / Gradio** | Python-code-as-UI. | UI defined imperatively/declaratively in code. | REJECT: not a spec format. | [S79] |

### 4.4 Spec-driven development (SDD) and agent-instruction standards

| System | What it is | Documented capabilities | Lesson for mdui | Src |
|---|---|---|---|---|
| **GitHub Spec Kit** | SDD toolkit. MIT, 139.6k★. | `/constitution → /specify → /clarify → /plan → /tasks → /analyze → /implement`; project **constitution**; extensions/presets/bundles; many agents. | ADAPT: make `.ui.md` the *UI artefact* inside Spec Kit flows; provide templates. | [S81][S82] |
| **Kiro** (AWS) | Agentic IDE with specs. | Requirements → Design → Tasks; **Requirements Analysis finds contradictions before coding**; "turn requirements into **executable properties**" exercised via property-based testing; steering files; hooks [S137]. EARS acceptance criteria per the docs site [S84] *(not reachable; unverified)*. | ADOPT: EARS for requirement IDs. **Nearest neighbour for executable specs (not UI-specific)** — cited in §8 for NOV-04. | [S83][S84][S137] |
| **OpenSpec** | Delta-based SDD. MIT, 70.8k★, 30+ agents. | `specs/` (truth) vs `changes/` (proposals); **ADDED / MODIFIED / REMOVED** deltas; propose→apply→archive; scenarios are **GIVEN / WHEN / THEN** [S86]. | ADAPT: delta vocabulary for `mdui diff`. | [S85][S86] |
| **Tessl** | Spec-as-source + registry. | Specs as durable truth; **drift detection and reconciliation**; versioned spec registry (10k+ specs). | ADAPT: drift concept → NOV-01 lockfile (but at UI-node granularity). | [S87][S88] |
| **Agent Skills** (`SKILL.md`) | Open standard (Dec 2025); 20+ platforms *(count from search)*. | **Verified limits [S131]:** `name` ≤ 64 chars, lowercase letters/digits/hyphens, no leading/trailing hyphen; `description` ≤ 1,024 chars; `compatibility` ≤ 500; optional `license`, `metadata`, experimental `allowed-tools`; dirs `scripts/ references/ assets/`; progressive disclosure (~100 tokens metadata → **< 5,000 tokens** recommended body → resources on demand); **"keep `SKILL.md` under 500 lines"**, references one level deep; validate with `skills-ref validate`. | ADOPT: restructure the skill to these numbers (T-053). | [S89][S92][S131] |
| **AGENTS.md** | "README for agents"; MIT; **24.7k★** on the repo [S91]. | Plain Markdown (dev tips, testing, PR instructions). *Stewardship by the Linux Foundation / Agentic AI Foundation, "60k projects" and the list of reading tools come from search results and are **not confirmed** on the repo page.* | ADOPT: ship a contributor `AGENTS.md` and a user snippet. A study questions blanket benefit of context files [S111] — measure before expanding. | [S90][S91][S111] |

### 4.5 Verification foundations (not competitors — enablers)

| Technology | Documented capability | Why it matters here | Src |
|---|---|---|---|
| **axe-core** | Rules engine (MPL-2.0, 7.6k★). **Verified [S93]:** "returns zero false positives (bugs notwithstanding)"; covers WCAG 2.0/2.1/2.2 A–AAA + best practices; "on average **57%** of WCAG issues" found automatically. | Baseline a11y verification; rules ≠ semantic conformance to a *spec*. | [S93][S94] |
| **WCAG 2.2** | **2.5.8 Target Size (Minimum)** — Level AA, **24×24 CSS px**, with five exceptions: spacing (24px circle must not intersect neighbours), equivalent control, inline, user-agent control, essential [S133]; also Focus Appearance (AAA), 3.3.8 Accessible Authentication. | Targets for a11y lint attributes; **the lint must model the spacing/inline exceptions**, not just a minimum size. | [S95][S133] |
| **Playwright ARIA snapshots** | `toMatchAriaSnapshot()` compares the accessibility tree (roles, names, states) to a YAML template. **Verified [S132]:** names exact or `/regex/`; attributes like `[level=1]`, `[checked]`; **partial matching** by omitting names/attributes; **comparison is order-sensitive**; templates generated via the code generator or `--update-snapshots`; positioned as structural, more resilient than screenshots. | Natural *oracle target* for compiled wireframes (NOV-02). **Design consequence:** order-insensitive regions need our own matcher; emitted templates must be order-correct. | [S96][S97][S132] |
| **Flutter semantics testing** | `SemanticsController`, `meetsGuideline` (tap-target 44/48, labelled targets). | Non-web oracle adapter. | [S98][S99] |
| **Chromatic** | Pixel snapshot baselines for Storybook. | Contrast case: pixel diff is wrong tool for lo-fi spec conformance. | [S73] |
| **Constrained decoding** (llguidance, XGrammar, llama.cpp GBNF, OpenAI custom-tool CFG) | Token-level masking enforces a CFG/regex/JSON-schema. **Verified:** llguidance ≈50 µs/token, MIT, used in OpenAI/llama.cpp/vLLM/SGLang [S100]; **XGrammar** supports JSON, regex and general CFG and is the default backend in vLLM, SGLang, TensorRT-LLM and MLC-LLM (XGrammar-2 announced May 2026) [S134]; **OpenAI custom tools accept `lark` or `regex` grammars** and the cookbook states CFGs "force the model to emit only strings that the grammar accepts" [S135]. *A community thread reports hosted Lark outputs not always conforming [S152, title only] — treat hosted CFG as a strong constraint, **not a guarantee**; always re-validate with the reference parser.* | Makes "valid DSL by construction" feasible on local engines and plausible on hosted APIs (NOV-03). | [S100][S101][S102][S103][S104][S134][S135][S152] (structured-generation frameworks Outlines [S154] and Guidance [S155] are listed in [S121]) |
| **Research on LLM-generated UI accessibility** | 84% of ChatGPT-generated sites showed accessibility problems (text resizing, contrast, semantics); a11y-oriented prompting helps but semantic gaps persist; CodeA11y studies assistants. | Evidence that *verification* (not just generation) is needed. | [S105][S106][S107] |
| **UI-to-code benchmarks** (Design2Code, WebAccessBench) | Design2Code scores generated front-ends by CLIP visual similarity plus block-match, text and position similarity against a *reference render*; WebAccessBench measures WCAG conformance of LLM-generated interfaces under three prompting regimes *(secondary/search-surfaced)*. | Prior art for NOV-02: they compare to a reference **render** or to generic rules — not to a **spec-derived expected semantic tree**. | [S144][S145] |
| **Round-trip engineering / three-way merge** | UML tools (Papyrus, Visual Paradigm) synchronise model and code bidirectionally with incremental merge; VCS three-way merge uses a common ancestor *(secondary)*. | Prior art for NOV-01 — the *technique* is established; the opening is its application to Markdown wireframes at layout-node granularity with agent protocol. | [S148][S149] |
| **Nielsen heuristics** | 10 usability heuristics (error prevention, recognition vs recall, consistency, …). | Taxonomy for UX constraint contracts (NOV-04). | [S108] |
| **promptfoo** | YAML eval configs with deterministic + model-graded assertions, CI thresholds; MIT, 25.6k★. **The repo page states the project was acquired by OpenAI but remains open source** [S136]. | Fits the "structural evaluation" strategy in `TESTING.md`. **Vendor-concentration risk** → keep the harness tool-agnostic (assertions are `mdui validate` runs; promptfoo is one runner). | [S109][S136] |

---

## 5. Capability matrix

`●` documented · `◐` partial/indirect · `○` not documented in reviewed sources (not proof of absence). "mdui" = this repo at v1.0.3.

| Capability | mdui | wiremd | Wiremark | Wireloom | Markdown-UI | mdocUI | OpenUI Lang | Salt | Markdoc | A2UI | json-render | MCP Apps | DESIGN.md |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Plain-text / Markdown-native source | ● | ● | ● | ● | ● | ● | ◐ | ◐ | ● | ◐ | ○ | ○ | ● |
| Formal grammar / schema validation | ○ | ○ | ○ | ○ | ○ | ● | ● | ○ | ● | ● | ● | ◐ | ◐ |
| Machine-readable AST / IR | ○ | ● | ◐ | ○ | ◐ | ● | ○ | ○ | ● | ● | ● | ○ | ◐ |
| CLI (lint / format / export) | ○ | ● | ● | ○ | ○ | ○ | ○ | ◐ | ○ | ○ | ○ | ○ | ● |
| Live preview / renderer | ○ | ● | ● | ● | ● | ● | ● | ● | ◐ | ● | ● | ● | ○ |
| Streaming / incremental parse | ○ | ○ | ○ | ○ | ○ | ● | ● | ○ | ○ | ● | ● | ● | ○ |
| Component allow-list / catalog | ○ | ○ | ○ | ○ | ◐ | ● | ● | ○ | ● | ● | ● | ◐ | ○ |
| Data binding / state | ◐ | ○ | ○ | ○ | ◐ | ○ | ○ | ○ | ◐ | ● | ● | ◐ | ○ |
| Design tokens | ◐ | ◐ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ◐ | ● |
| Accessibility checks | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ◐ |
| Multi-framework output | ◐ | ● | ○ | ○ | ◐ | ◐ | ● | ○ | ◐ | ● | ● | ○ | ◐ |
| Two-way spec↔code sync / drift | ◐ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| MCP / agent tool surface | ○ | ◐ | ○ | ◐ | ○ | ○ | ○ | ◐ | ○ | ○ | ● | ● | ○ |
| Prompt generation from schema | ○ | ○ | ○ | ○ | ○ | ● | ● | ○ | ○ | ◐ | ● | ○ | ○ |
| Multi-screen flows | ○ | ○ | ● | ○ | ○ | ○ | ○ | ◐ | ○ | ○ | ○ | ○ | ○ |
| Language versioning / governance | ○ | ◐ | ○ | ◐ | ○ | ◐ | ○ | ○ | ◐ | ● | ◐ | ● | ◐ |
| Embeds in Markdown viewers (fence / SVG) | ○ | ◐ | ● | ● | ● | ○ | ○ | ◐ | ○ | ○ | ○ | ○ | ○ |
| Published token-efficiency benchmark | ○ | ○ | ○ | ○ | ○ | ○ | ● | ○ | ○ | ◐ | ○ | ○ | ○ |

**Reading the matrix.** (1) mdui is behind on nearly every *tooling* row and on *Markdown-viewer embedding* and *token-efficiency evidence*; (2) it is the only entry with any *two-way sync* semantics — and the weakest-implemented thing on the list, so simultaneously the moat and the biggest liability; (3) **no surveyed system documents accessibility verification of generated UI against its own spec**; multi-screen flow *does* exist in text-native form in Wiremark (named frames, `to=#id`) and partially in Salt (screens embedded in activity diagrams), so LNG-08 is parity-plus, with flow-level *constraints* (NOV-04) as the differentiator; (4) the strongest protocols (A2UI, json-render) are *JSON-first*, but Google's own *Express* DSL and OpenUI Lang show the market moving toward **compact text DSLs for LLM output** — the human-readable authoring layer is contested, not open.

Row evidence is in the corresponding §4 cards; columns added in rev. 2: Wiremark, Wireloom, OpenUI Lang. Notable judgement calls: Salt "CLI ◐" and "MCP ◐" derive from PlantUML's tooling ecosystem and a marketplace Claude skill [S14, unverified], not from Salt itself; wiremd "MCP ◐" derives from its Claude plugin [S01]; Wireloom "MCP ◐" is its Claude skill + `AGENTS.md` [S116]; A2UI "plain-text ◐" is its *Express* DSL [S114]; MCP Apps "tokens ◐" refers to host-provided CSS variables [S27]; `○` means *not documented in the sources reviewed*, never proof of absence.

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
| G12 | No multi-screen flows | Wiremark named frames + `to=#id` [S117]; Salt screens in activity diagrams [S12]; Stitch multi-screen [S58]; IFML [S80]; Airbnb screens [S53]; Uizard [S78] | **ADAPT** (text-native; parity, then differentiate with NOV-04) | LNG-08 |
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
| G26 | Specs cannot be rendered inside READMEs/PRs/notes | Wiremark fence + host adapters [S117]; Wireloom SVG in GitHub/Obsidian/Notion [S116]; Mermaid native fences [S140] | **ADOPT** | TLS-13 |
| G27 | No measured token efficiency | OpenUI Lang −52.8% vs Vercel JSON over 7 scenarios [S115]; A2UI Express [S114] | **ADOPT** (measure honestly, publish whatever it shows) | TLS-12 (promoted), SP-4 |
| G28 | Primitive gaps seen in Salt | Tree, tree-table, group box, menu bars, scrollbars, titled separators, icon set, title/caption, scale/dpi [S12] | **ADAPT** | LNG-04, TLS-06, LNG-10 |
| G29 | Exporters pinned to a stale A2UI | A2UI v1.0 message set (`createSurface`, `updateComponents`, `updateDataModel`, …) and JSON-Pointer bindings [S112] | **ADOPT** | AGT-05 |
| G30 | Tooling vendor concentration | promptfoo now OpenAI-owned per its repo page [S136]; Storybook MCP repo archived/moved [S130]; AI SDK RSC paused [S50] | **ADOPT** (tool-agnostic harness, pinned/adaptered deps) | QLT-02, DSY-06 |

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
        Salt  wiremd Wiremark    │   Markdown-UI   mdocUI
                       ┌──────┼──────────────────┐
                       │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓    │   ← mdui target:
         Balsamiq ─────┤   ▓ markdown-ui-dsl ▓   │     human-first spec
                       │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓    │     + verified code sync
                       └──────┼──────────────────┘     + protocol exporters
   Design-time ◄──────────────┼──────────────► Run-time (agent→user)
   (wireframe → code)         │                (generative UI)
                    DESIGN.md │  A2UI  OpenUI  json-render  MCP Apps
                              ▼
                     Machine-first protocol
```

**Strategic stance.** *Be the human-readable, diffable, verifiable authoring layer that compiles into the machine protocols* (A2UI, json-render, Adaptive Cards, Block Kit) and consumes the machine design-system formats (DESIGN.md, DTCG). Do not compete as a runtime protocol.

---

## 8. Novelty analysis

For each candidate: what it is, the **nearest prior art found (rev. 2 re-scoped)**, and the residual opening. Claims are bounded per [§2.3](#23-limitations-and-how-to-read-novelty-claims). *Rev. 2 narrowed all four*: the underlying techniques exist; what remains new is their **specific combination for a Markdown wireframe DSL**, and each is therefore shipped with a falsifiable metric rather than a novelty assertion.

| ID | Candidate | Nearest prior art | Residual opening (what is still unmatched in the sources reviewed) |
|---|---|---|---|
| **NOV-01** | **Anchored three-way sync** — per-node anchors in spec *and* generated code plus a lockfile of the last-synced AST; sync is a node-level three-way merge (base/spec/code) with conflict classes, replacing "ask which file is the source of truth". | **Round-trip engineering** in UML tools (Papyrus, Visual Paradigm) synchronises model↔code bidirectionally with incremental merge [S148]; **three-way merge** with a common ancestor is standard VCS practice [S149]; Tessl spec-level drift detection [S87]; Code Connect component mapping [S129]; OpenSpec requirement deltas [S86]. | None documented applies it to a **Markdown wireframe ↔ framework code** at **layout-node** granularity with a committed lockfile and an **agent hand-off protocol**. *Technique is established; application is new.* |
| **NOV-02** | **Spec Oracle** — compile the wireframe AST into expected **accessibility-tree** assertions, run them against the generated app, report per-node verdicts and a **Fidelity Score** mapped to spec lines. | Playwright ARIA snapshots (hand-written; order-sensitive, partial matching) [S132]; axe rules (zero-false-positive, rule-based, ~57% of issues) [S93]; **Design2Code** scores against a reference *render* (CLIP + block/text/position) and **WebAccessBench** measures WCAG conformance of generated UIs [S144][S145]; Chromatic pixel baselines [S73]; Flutter `meetsGuideline` [S98]. | No surveyed system **derives the expected semantic tree from a wireframe spec** and scores conformance node-by-node. *Metrics exist; the spec-derived oracle is new.* |
| **NOV-03** | **Valid-by-construction grammar pack** — emit Lark / GBNF / JSON-Schema from the DSL grammar **and the project's catalog + tokens + data keys**, with a parser-parity guarantee. | **A2UI ships `Express.g4`, an ANTLR grammar for a compact UI DSL** [S114]; OpenUI Lang is a line-oriented DSL with typed component contracts [S115]; json-render/A2UI constrain *JSON* by schema [S38][S20]; OpenAI custom tools accept Lark/regex grammars [S135]; XGrammar/llguidance make CFG decoding fast [S134][S100]; decode-time grammars [S103]. | No documentation found of a grammar for a **Markdown** wireframe DSL **specialised per project catalog** and parity-tested against the parser, nor of Express/OpenUI grammars being used for constrained decoding. *Hosted-API conformance is not guaranteed (see §4.5) — validation always re-runs.* |
| **NOV-04** | **UX Constraint Contracts** — lintable UX heuristics evaluated on the **wireframe and flow graph** pre-code, re-verified post-code through NOV-02. | DESIGN.md token lint [S54]; axe DOM rules [S93]; Nielsen heuristics as guidance [S108]; **Kiro's executable-property checks of requirements** [S137]. | None documented evaluates **flow-level UX heuristics on a lo-fi spec** before code. *Closest executable-spec analogue is requirements-level, not UI-level.* |

Each novel feature is specified in [`FEATURE_ADDITIONS.md`](FEATURE_ADDITIONS.md#5-novel--breakthrough-features) with a falsifiable success metric so the novelty claim can be tested rather than asserted.

---

## 9. Source register

Access date for all entries: **2026-10-01**. Status codes are defined in [§2.4](#24-verification-pass-rev-2-same-day): **V** verified · **V≈** verified via an equivalent primary · **C** corroborated by search summaries only · **U** unverified. Titles starting with a canonical-but-blocked site keep the canonical URL so reviewers can check.

| ID | Tier | Status | Title | URL | Note |
|---|:-:|:-:|---|---|---|
| S01 | T1 | V | wiremd — text-first UI design tool (repo) | https://github.com/akonan/wiremd/ |  |
| S02 | T1 | V≈ | WireMD — Design UI Mockups with Markdown | https://wiremd.dev/ | via S01 |
| S03 | T3 | U | Show HN: WireMD | https://news.ycombinator.com/item?id=46033258 | title only |
| S04 | T1 | V | BlueprintLabIO/markdown-ui | https://github.com/BlueprintLabIO/markdown-ui |  |
| S05 | T1 | V≈ | Markdown-UI site | https://markdown-ui.blueprintlab.io/ | via S04 |
| S06 | T1 | V | mdocUI repository | https://github.com/mdocui/mdocui |  |
| S07 | T1 | V≈ | mdocUI documentation | https://mdocui.github.io/ | via S06 |
| S08 | T1 | V≈ | Markdoc | https://markdoc.dev/ | via S138 (tags, schema, pipeline; severity levels unconfirmed) |
| S09 | T1 | V≈ | Markdoc — Validation | https://markdoc.dev/docs/validation | via S138 (partial; severity levels unconfirmed) |
| S10 | T1 | V≈ | Markdoc — Tags | https://markdoc.dev/docs/tags | via S138 (partial) |
| S11 | T1 | V≈ | MDX — Markdown for the component era | https://mdxjs.com/ | via S139 |
| S12 | T1 | V | PlantUML — Salt (wireframe GUI) | https://plantuml.com/salt | Verified against the **owner-supplied capture** of this page (FireShot PDF, 2026-10-01); live URL blocked |
| S13 | T3 | V≈ | PlantUML Salt cheat sheet (gist) | https://gist.github.com/wonderstory/31b8b32a2843f3475398a377c41aee52 | via S12 |
| S14 | T3 | U | PlantUML Salt Wireframer — Claude Code skill | https://mcpmarket.com/tools/skills/plantuml-salt-wireframer | marketplace listing; blocked |
| S15 | T1 | U | Balsamiq — The BMPR file format | https://balsamiq.com/wireframes/desktop/docs/bmpr-format/ |  |
| S16 | T3 | U | BMML file (FileInfo) | https://fileinfo.com/extension/bmml |  |
| S17 | T1 | V≈ | Mermaid — Architecture diagrams | https://mermaid.js.org/syntax/architecture.html | via S140 |
| S18 | T2 | U | Build interactive React UIs for LLM outputs using llm-ui (LogRocket) | https://blog.logrocket.com/react-llm-ui/ |  |
| S19 | T3 | U | Why Markdoc for LLM Streaming UI (DEV) | https://dev.to/abhaygawade/why-markdoc-for-llm-streaming-ui-3m26 |  |
| S20 | T1 | V | A2UI (Google) | https://github.com/google/A2UI |  |
| S21 | T2 | C | Google Introduces A2UI (MarkTechPost) | https://www.marktechpost.com/2025/12/22/google-introduces-a2ui-agent-to-user-interface-an-open-sourc-protocol-for-agent-driven-interfaces/ |  |
| S22 | T3 | C | Introduction to A2UI | https://a2ui.sh/articles/introduction-to-a2ui |  |
| S23 | T1 | V | Generative UI SDK for Flutter (genui) | https://github.com/flutter/genui |  |
| S24 | T1 | V≈ | GenUI SDK main components and concepts | https://docs.flutter.dev/ai/genui/components | via S23 (partial) |
| S25 | T1 | V≈ | New updates to A2UI and Flutter's GenUI package | https://flutter.dev/blog/new-updates-to-a2ui-and-flutters-genui-package | via S23 (partial) |
| S26 | T1 | V≈ | SEP-1865: MCP Apps | https://modelcontextprotocol.io/seps/1865-mcp-apps-interactive-user-interfaces-for-mcp | via S122 (partial; SEP text and authorship unconfirmed) |
| S27 | T1 | V | MCP Apps specification 2026-01-26 | https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx |  |
| S28 | T1 | V≈ | MCP Apps: Extending servers with interactive user interfaces | https://blog.modelcontextprotocol.io/posts/2025-11-21-mcp-apps/ | via S122 (partial) |
| S29 | T2 | V≈ | MCP UI: Breaking the text wall (Shopify Engineering) | https://shopify.engineering/mcp-ui-breaking-the-text-wall | via S123 |
| S30 | T1 | V≈ | RemoteDOMResourceRenderer (mcp-ui docs) | https://mcpui.dev/guide/client/remote-dom-resource.html | via S123 |
| S31 | T2 | V≈ | MCP-UI technical overview (WorkOS) | https://workos.com/blog/mcp-ui-a-technical-deep-dive-into-interactive-agent-interfaces | via S123 |
| S32 | T2 | V≈ | Remote rendering: Shopify's take on extensible UI | https://shopify.engineering/remote-rendering-ui-extensibility | via S33 |
| S33 | T1 | V | Shopify/remote-dom core | https://github.com/Shopify/remote-dom/tree/main/packages/core | Repo root verified (MIT, 1.3k★); the `packages/core` path was not separately read |
| S34 | T1 | V≈ | AG-UI — State management | https://docs.ag-ui.com/concepts/state | via S124 (event count ~16; JSON-Patch unconfirmed) |
| S35 | T1 | V≈ | AG-UI — Generative UI specs | https://docs.ag-ui.com/concepts/generative-ui-specs | via S125 |
| S36 | T2 | V≈ | The Developer's Guide to the AG-UI Protocol (CopilotKit) | https://www.copilotkit.ai/blog/developers-guide-to-the-ag-ui-protocol | via S124 (event count differs: ~16 vs 17) |
| S37 | T1 | V≈ | Open-JSON-UI (CopilotKit docs) | https://docs.copilotkit.ai/mastra/generative-ui/open-json-ui | via S125 |
| S38 | T1 | V | vercel-labs/json-render | https://github.com/vercel-labs/json-render |  |
| S39 | T2 | V≈ | Vercel Releases JSON-Render (InfoQ) | https://www.infoq.com/news/2026/03/vercel-json-render/ | via S38 (InfoQ page itself unreachable) |
| S40 | T1 | U | ChatKit widgets (OpenAI) | https://developers.openai.com/api/docs/guides/chatkit-widgets |  |
| S41 | T1 | U | Add UI to your MCP server (Apps SDK) | https://developers.openai.com/apps-sdk/plan/components |  |
| S42 | T1 | U | UI guidelines (OpenAI) | https://developers.openai.com/plugins/concepts/ui-guidelines |  |
| S43 | T1 | V≈ | Action.Execute (Adaptive Cards) | https://learn.microsoft.com/en-us/adaptive-cards/schema-explorer/action-execute | via S126 (partial) |
| S44 | T1 | V≈ | Templating SDKs (Adaptive Cards) | https://learn.microsoft.com/en-us/adaptive-cards/templating/sdk | via S126 (partial) |
| S45 | T1 | U | What is C1 by Thesys? | https://docs.thesys.dev/guides/what-is-thesys-c1 |  |
| S46 | T1 | V | tambo-ai/tambo | https://github.com/tambo-ai/tambo |  |
| S47 | T1 | V≈ | Tambo — Generative Components | https://docs.tambo.co/concepts/generative-interfaces/generative-components | via S46 |
| S48 | T1 | V≈ | Hashbrown | https://hashbrown.dev/ | via S127 |
| S49 | T1 | V≈ | Introducing AI SDK 3.0 with Generative UI support | https://vercel.com/blog/ai-sdk-3-generative-ui | via S50 (archived/paused) |
| S50 | T1 | V | ai-sdk-preview-rsc-genui | https://github.com/vercel-labs/ai-sdk-preview-rsc-genui | Verified: repo archived; AI SDK RSC development paused |
| S51 | T1 | V≈ | `slack blocks preview` | https://docs.slack.dev/tools/slack-cli/reference/commands/slack_blocks_preview/ | via S52 (partial) |
| S52 | T1 | V | Slack Block Kit agent skill | https://github.com/slackapi/slack-skills-plugin/blob/main/skills/block-kit/SKILL.md |  |
| S53 | T2 | C | A deep dive into Airbnb's server-driven UI system | https://medium.com/airbnb-engineering/a-deep-dive-into-airbnbs-server-driven-ui-system-842244c5f5 |  |
| S54 | T1 | V | google-labs-code/design.md | https://github.com/google-labs-code/design.md |  |
| S55 | T2 | C | Google's open-source DESIGN.md (The Decoder) | https://the-decoder.com/googles-open-source-design-md-gives-ai-agents-a-prompt-ready-blueprint-for-brand-consistent-design/ |  |
| S56 | T3 | V | awesome-design-md | https://github.com/VoltAgent/awesome-design-md/blob/main/README.md |  |
| S57 | T3 | C | What is DESIGN.md / Google Stitch (MindStudio) | https://www.mindstudio.ai/blog/what-is-design-md-google-stitch |  |
| S58 | T3 | C | Design Mobile App UI with Google Stitch (Codecademy) | https://www.codecademy.com/article/google-stitch-tutorial-ai-powered-ui-design-tool |  |
| S59 | T3 | C | Google Stitch overview (ScriptByAI) | https://www.scriptbyai.com/google-stitch/ |  |
| S60 | T1 | V≈ | Design Tokens Format Module 2025.10 | https://w3c.github.io/cg-reports/design-tokens/CG-FINAL-format-20251028/ | via S61, S141 (stable-status wording from report page unconfirmed; repo shows reports as drafts) |
| S61 | T1 | V | design-tokens/community-group | https://github.com/design-tokens/community-group |  |
| S62 | T1 | V≈ | Design Tokens Community Group | https://www.designtokens.org/ | via S61 |
| S63 | T1 | V | style-dictionary/style-dictionary | https://github.com/style-dictionary/style-dictionary | Verified: Apache-2.0, 4.8k★. **Not stated:** Amazon origin; DTCG support |
| S64 | T1 | U | Tokens Studio — Style Dictionary + SD Transforms | https://docs.tokens.studio/transform-tokens/style-dictionary |  |
| S65 | T1 | V≈ | Figma MCP — Tools and prompts | https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/ | via S128 |
| S66 | T1 | V≈ | Figma MCP — Add custom rules | https://developers.figma.com/docs/figma-mcp-server/add-custom-rules/ | via S128 (partial) |
| S67 | T1 | V≈ | Guide to the Figma MCP server | https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server | via S128 |
| S68 | T1 | V | penpot/penpot | https://github.com/penpot/penpot |  |
| S69 | T2 | C | Penpot experimenting with MCP servers (Smashing) | https://www.smashingmagazine.com/2026/01/penpot-experimenting-mcp-servers-ai-powered-design-workflows/ |  |
| S70 | T1 | U | pen.dev CLI documentation | https://docs.pencil.dev/for-developers/pen-cli |  |
| S71 | T1 | U | @pencil.dev/cli (npm) | https://www.npmjs.com/package/@pencil.dev/cli |  |
| S72 | T1 | V≈ | Storybook MCP server | https://storybook.js.org/docs/ai/mcp/overview | via S130 (repo archived/moved) |
| S73 | T1 | U | Automate visual testing (Storybook handbook) | https://storybook.js.org/tutorials/visual-testing-handbook/react/en/automate/ |  |
| S74 | T1 | U | v0 — Design Systems 2.0 | https://v0.app/docs/design-systems-2 |  |
| S75 | T1 | U | AI-powered prototyping with design systems (Vercel) | https://vercel.com/blog/ai-powered-prototyping-with-design-systems |  |
| S76 | T1 | V | BuilderIO/mitosis | https://github.com/BuilderIO/mitosis |  |
| S77 | T3 | U | Figma to Code Tools Compared | https://www.snapflow.design/en/blog/figma-to-code-tools-compared |  |
| S78 | T3 | U | Best AI Wireframing Tools 2026 | https://wireframingtools.org/best-ai-wireframing-tools/ |  |
| S79 | T3 | U | Streamlit vs Gradio (UI Bakery) | https://uibakery.io/blog/streamlit-vs-gradio |  |
| S80 | T1 | U | IFML — OMG | https://www.omg.org/ifml/ |  |
| S81 | T1 | V | github/spec-kit | https://github.com/github/spec-kit |  |
| S82 | T2 | U | Exploring spec-driven development with GitHub Spec Kit (LogRocket) | https://blog.logrocket.com/github-spec-kit/ |  |
| S83 | T1 | V≈ | Kiro — Feature specs | https://kiro.dev/docs/specs/feature-specs/ | via S137 (partial) |
| S84 | T1 | V≈ | Kiro — Requirements-first specs | https://kiro.dev/docs/specs/feature-specs/requirements-first/ | via S137 (EARS not confirmed) |
| S85 | T1 | V | Fission-AI/OpenSpec | https://github.com/Fission-AI/OpenSpec |  |
| S86 | T1 | V | OpenSpec — concepts | https://github.com/Fission-AI/OpenSpec/blob/main/docs/concepts.md |  |
| S87 | T1 | U | Tessl — Concepts | https://docs.tessl.io/introduction-to-tessl/concepts |  |
| S88 | T1 | U | Tessl launches spec-driven framework and registry | https://tessl.io/blog/tessl-launches-spec-driven-framework-and-registry |  |
| S89 | T1 | V≈ | Agent Skills specification *(URL as cited by S92; canonical site not fetched)* | https://agentskills.io/specification | via S131 (exact limits verified) |
| S90 | T1 | V≈ | AGENTS.md | https://agents.md/ | via S91 (partial) |
| S91 | T1 | V | agentsmd/agents.md | https://github.com/agentsmd/agents.md | Verified: 24.7k★. **Not confirmed on page:** Linux Foundation/AAIF stewardship, "60k projects", tool list |
| S92 | T3 | C | Agent Skills Explained (Firecrawl) | https://www.firecrawl.dev/blog/agent-skills |  |
| S93 | T1 | V | dequelabs/axe-core | https://github.com/dequelabs/axe-core |  |
| S94 | T2 | V≈ | Automated testing identifies 57% of digital accessibility issues (Deque) | https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues/ | via S93 (57% confirmed) |
| S95 | T3 | V≈ | What's New in WCAG 2.2 (AudioEye) — canonical: https://www.w3.org/TR/WCAG22/ *(Blocked)* | https://www.audioeye.com/post/wcag-22/ | via S133 (2.5.8 confirmed) |
| S96 | T3 | V≈ | How ARIA Snapshot Testing Solves Common Playwright Issues (DZone) | https://dzone.com/articles/aria-snapshot-testing-playwright | via S132 |
| S97 | T2 | V≈ | Playwright docs mirror — Aria snapshots — canonical: https://playwright.dev/docs/aria-snapshots *(Blocked)* | https://docs.w3cub.com/playwright/aria-snapshots.html | via S132 |
| S98 | T1 | U | Flutter — Accessibility testing | https://docs.flutter.dev/ui/accessibility/accessibility-testing |  |
| S99 | T1 | U | SemanticsController (flutter_test) | https://api.flutter.dev/flutter/flutter_test/SemanticsController-class.html |  |
| S100 | T1 | V | guidance-ai/llguidance | https://github.com/guidance-ai/llguidance |  |
| S101 | T1 | V≈ | XGrammar: Flexible and Efficient Structured Generation (arXiv 2411.15100) | https://arxiv.org/pdf/2411.15100 | via S134 |
| S102 | T1 | V≈ | GPT-5 new params and tools — custom tools & CFG (OpenAI Cookbook) | https://cookbook.openai.com/examples/gpt-5/gpt-5_new_params_and_tools | via S135 (Lark/regex confirmed) |
| S103 | T1 | U | Decode-Time Grammars (arXiv 2607.18357) | https://arxiv.org/abs/2607.18357 | preprint abstract via search only |
| S104 | T1 | U | Generating Structured Outputs from LMs: Benchmark and Studies (arXiv 2501.10868) | https://arxiv.org/html/2501.10868v1 |  |
| S105 | T1 | C | Does ChatGPT Generate Accessible Code? (ACM) | https://dl.acm.org/doi/full/10.1145/3677846.3677854 |  |
| S106 | T1 | C | CodeA11y: Making AI Coding Assistants Useful for Accessible Web Development (ACM) | https://dl.acm.org/doi/10.1145/3706598.3713335 |  |
| S107 | T1 | C | When LLM-Generated Code Perpetuates UI Accessibility Barriers… (ACM) | https://dl.acm.org/doi/10.1145/3744257.3744266 |  |
| S108 | T1 | C | 10 Usability Heuristics Applied to Complex Applications (NN/g) | https://www.nngroup.com/articles/usability-heuristics-complex-applications/ |  |
| S109 | T1 | V≈ | promptfoo — Command line | https://www.promptfoo.dev/docs/usage/command-line/ | via S136 |
| S110 | T2 | C | Master the 17 AG-UI Event Types (CopilotKit) | https://www.copilotkit.ai/blog/master-the-17-ag-ui-event-types-for-building-agents-the-right-way | event count (17) differs from repo README (~16) [S124] |
| S111 | T1 | U | Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents? (arXiv 2602.11988) — *read pp. 1-9 (T-053): context files do not significantly improve success, raise cost ~20%; overviews unhelpful; see ADR-006* | https://arxiv.org/pdf/2602.11988 | read (main text) |
| S112 | T1 | V | A2UI protocol v1.0 (`a2ui_protocol.md`, raw) | https://raw.githubusercontent.com/google/A2UI/main/specification/v1_0/docs/a2ui_protocol.md |  |
| S113 | T1 | V | A2UI specification directory (v0_8, v0_9, v0_9_1, v1_0, inference_formats) | https://github.com/google/A2UI/tree/main/specification | Spec README: "candidate for becoming stable" |
| S114 | T1 | V | A2UI Express grammar (`Express.g4`, raw) | https://raw.githubusercontent.com/google/A2UI/main/specification/inference_formats/express/Express.g4 |  |
| S115 | T1 | V | thesysdev/openui — OpenUI Lang | https://github.com/thesysdev/openui | Benchmark numbers quoted from README; methodology in its `benchmarks/` dir (not read) |
| S116 | T1 | V | StardockCorp/Wireloom | https://github.com/StardockCorp/Wireloom |  |
| S117 | T1 | V | Blackburn-Labs/wiremark | https://github.com/Blackburn-Labs/wiremark |  |
| S118 | T1 | V | iwabuchi404/ASCIIwire | https://github.com/iwabuchi404/ASCIIwire |  |
| S119 | T1 | C | wiremark.dev | https://wiremark.dev/ | blocked |
| S120 | T1 | V | MegaByteMark/markdown-ui-dsl (upstream of this project) | https://github.com/MegaByteMark/markdown-ui-dsl |  |
| S121 | T3 | V | narrowin/awesome-generative-ui (curated list) | https://github.com/narrowin/awesome-generative-ui | Used for discovery only |
| S122 | T1 | V | modelcontextprotocol/ext-apps | https://github.com/modelcontextprotocol/ext-apps |  |
| S123 | T1 | V | idosal/mcp-ui | https://github.com/idosal/mcp-ui |  |
| S124 | T1 | V | ag-ui-protocol/ag-ui | https://github.com/ag-ui-protocol/ag-ui |  |
| S125 | T1 | V | CopilotKit/generative-ui | https://github.com/CopilotKit/generative-ui |  |
| S126 | T1 | V | microsoft/AdaptiveCards | https://github.com/microsoft/AdaptiveCards |  |
| S127 | T1 | V | liveloveapp/hashbrown | https://github.com/liveloveapp/hashbrown |  |
| S128 | T1 | V | figma/mcp-server-guide | https://github.com/figma/mcp-server-guide |  |
| S129 | T1 | V | figma/code-connect | https://github.com/figma/code-connect |  |
| S130 | T1 | V | storybookjs/mcp (archived 2026-09-07; moved to storybookjs/storybook) | https://github.com/storybookjs/mcp |  |
| S131 | T1 | V | Agent Skills specification (`docs/specification.mdx`) | https://github.com/agentskills/agentskills/blob/main/docs/specification.mdx |  |
| S132 | T1 | V | Playwright docs — Aria snapshots (source on GitHub) | https://github.com/microsoft/playwright/blob/main/docs/src/aria-snapshots.md |  |
| S133 | T1 | V | WCAG 2.2 Understanding SC 2.5.8 Target Size (Minimum) (source on GitHub) | https://github.com/w3c/wcag/blob/main/understanding/22/target-size-minimum.html |  |
| S134 | T1 | V | mlc-ai/xgrammar | https://github.com/mlc-ai/xgrammar |  |
| S135 | T1 | V | OpenAI Cookbook — GPT-5 new params and tools (notebook; read via raw GitHub) | https://github.com/openai/openai-cookbook/blob/main/examples/gpt-5/gpt-5_new_params_and_tools.ipynb |  |
| S136 | T1 | V | promptfoo/promptfoo | https://github.com/promptfoo/promptfoo | Repo page states acquisition by OpenAI |
| S137 | T1 | V | kirodotdev/Kiro | https://github.com/kirodotdev/Kiro |  |
| S138 | T1 | V | markdoc/markdoc | https://github.com/markdoc/markdoc | 8.5k★, MIT; severity levels not confirmed on README |
| S139 | T1 | V | mdx-js/mdx | https://github.com/mdx-js/mdx |  |
| S140 | T1 | V | mermaid-js/mermaid | https://github.com/mermaid-js/mermaid |  |
| S141 | T1 | V | DTCG technical reports directory (format, color, resolver) | https://github.com/design-tokens/community-group/tree/main/technical-reports |  |
| S142 | T3 | V | j3k0/mockup-maker (text → .bmml generator) | https://github.com/j3k0/mockup-maker | Does not confirm BMML is XML |
| S143 | T1 | V | DESIGN.md specification (`docs/spec.md`) | https://github.com/google-labs-code/design.md/blob/main/docs/spec.md |  |
| S144 | T1 | C | Design2Code: Benchmarking Multimodal Code Generation (arXiv 2403.03163) | https://arxiv.org/html/2403.03163v3 | blocked; metrics per search summaries |
| S145 | T2 | C | WebAccessBench whitepaper | https://conesible.de/wab/whitepaper_webaccessbench.pdf | blocked |
| S146 | T3 | C | What is Claude Design? (Anima blog) | https://animaapp.com/blog/ai-design-en/what-is-claude-design/ | secondary |
| S147 | T3 | C | Superdesign — AI design tool for developers | https://superdesign.dev/blog/ai-design-tool-for-developers | vendor blog |
| S148 | T3 | C | Round-trip engineering (Wikipedia) | https://en.wikipedia.org/wiki/Round-trip_engineering | secondary |
| S149 | T3 | C | Merge (version control) (Wikipedia) | https://en.wikipedia.org/wiki/Merge_(version_control) | secondary |
| S150 | T3 | U | TokUI | https://tokui.jboltai.com/en/ | search listing only; not analysed |
| S151 | T3 | C | OpenUI: framework that uses 67% fewer tokens than JSON (The Menon Lab) | https://themenonlab.blog/blog/openui-generative-ui-framework-token-efficient | secondary; figures also in S115 |
| S152 | T3 | U | Community thread: GPT-5 custom Lark tool outputs not guaranteed to conform to the CFG | https://community.openai.com/t/gpt-5-custom-lark-tool-outputs-are-not-guaranteed-to-conform-to-the-cfg/1337673 | title only |
| S153 | T3 | U | Show HN: A Markdown DSL to stop AI agents from hallucinating UI code | https://news.ycombinator.com/item?id=47342943 | title only |
| S154 | T1 | U | dottxt-ai/outlines (structured generation) | https://github.com/dottxt-ai/outlines | listing in S121 only |
| S155 | T1 | U | guidance-ai/guidance | https://github.com/guidance-ai/guidance | listing in S121 only |
| S156 | T1 | U | assistant-ui/assistant-ui | https://github.com/assistant-ui/assistant-ui | listing in S121 only |
| S157 | T3 | C | Onlook — AI features | https://www.onlook.com/features/ai | vendor page |

**Tally (157 sources):** V = 55 · V≈ = 45 · C = 23 · U = 34. Of the 111 sources in rev. 1, **69** are now verified directly or through an equivalent primary; **14** are corroborated only; **28** remain unverified because no reachable primary exists in this environment.

**Before external use** (marketing, RFCs, release notes), re-check every `C`/`U` claim at its URL, and re-verify `V` star counts and versions — they are snapshots.
