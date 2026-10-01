# Agent skills — index, routing and vetting

| | |
|---|---|
| **Snapshot** | 2026-10-01 |
| **Project-local skills** | **32** in `.agents/skills/` and an identical copy in `.claude/skills/` (25 new from GitHub · 6 from the installed set · 1 project skill) |
| **Manifest / pins** | [`.agents/skills-manifest.json`](../.agents/skills-manifest.json) — source repo, commit, licence, vetting date, tree hash per skill |
| **Manager** | `python3 scripts/skills.py {install,verify,validate,audit,sync}` (stdlib only) |
| **Standard** | Agent Skills spec limits (name ≤ 64, description ≤ 1,024, `SKILL.md` ≤ 500 lines recommended) — all 32 pass the official `skills-ref validate` (vendored at `reference/sdd/agentskills/skills-ref`) |
| **Licences** | [`THIRD_PARTY_LICENSES/skills/`](../THIRD_PARTY_LICENSES/skills/README.md) |

> **Why two folders?** `.agents/skills/` is the cross-agent location (Codex, Cursor, Gemini CLI, Copilot, …); `.claude/skills/` is what Claude Code reads. They are kept byte-identical (`skills.py verify` fails on drift). Our own skill is edited in `skills/markdown-ui-dsl/` and propagated with `skills.py sync`.

## 1. Routing table — which skill for which work

| When you are… | Use (in order) | Plan reference |
|---|---|---|
| Starting a session / unsure what exists | `using-agent-skills`, `context-engineering` | — |
| Writing an RFC, spec section or feature definition | `spec-driven-development` → `source-driven-development` (ground in official docs) → `doubt-driven-development` (adversarial review) → `documentation-and-adrs` | SPEC §2, T-012, ADRs in T-002 |
| Splitting an `L` task or planning a phase | `planning-and-task-breakdown`, `constraint-driven-development` (quality bar) | PLAN §11 definition of ready |
| Implementing parser / AST / grammar (T-010…T-028) | `test-driven-development`, `property-testing`, `incremental-implementation`, `api-and-interface-design` | SPEC §5–6 |
| Debugging a failing parity / streaming / oracle test | `systematic-debugging`, `verification-before-completion` | SPEC §6 |
| Lifting code from `reference/` | `source-driven-development`, `code-simplification` (the *improve* step), `security-and-hardening` | PLAN §14 |
| Lint rules and accessibility semantics (T-032, QLT-03) | `accessibility`, `a11y-playwright-testing` | SPEC §2.2 a11y attributes |
| Spec Oracle and e2e verification (T-076, T-077, T-080) | `a11y-playwright-testing`, `webapp-testing`, `property-testing` | NOV-02 |
| Preview renderer, SVG, docs site (T-040, T-092, T-094) | `frontend-design`, `web-quality-audit`, `best-practices`, `accessibility`, `webapp-testing` | TLS-06, TLS-13 |
| MCP server (T-062, T-081) | `mcp-builder`, `api-and-interface-design` | TLS-08 |
| Skill restructure / evals (T-053, T-063) | `skill-creator`, `writing-skills`, `context-engineering`, `property-testing` | AGT-01, QLT-02 |
| Sync, lockfile, sandboxing (T-070…T-075) | `security-and-hardening`, `git-workflow-and-versioning`, `using-git-worktrees` | NOV-01, AGT-04 |
| Opening / reviewing / answering review on a PR | `code-review-and-quality`, `requesting-code-review`, `receiving-code-review`, `verification-before-completion` | PLAN driving-to-green |
| Running parallel streams | `dispatching-parallel-agents`, `using-git-worktrees` | PLAN §6 |

`superpowers:*` names inside the obra skills resolve to the equivalent skills above (`test-driven-development`, `verification-before-completion`); the vendored set intentionally contains one skill per job to avoid duplicates.

## 2. Project-local skills (32)

| Skill | Tier | Source | Licence | Pin | Why it is here |
|---|---|---|---|---|---|
| `spec-driven-development` | github | addyosmani/agent-skills | MIT | `2686b620fc` | Write the spec before code — the method this repo's docs follow; use for every v2 RFC and feature. |
| `planning-and-task-breakdown` | github | addyosmani/agent-skills | MIT | `2686b620fc` | Ordered, verifiable tasks with acceptance criteria — matches docs/TASKS.md conventions. |
| `incremental-implementation` | github | addyosmani/agent-skills | MIT | `2686b620fc` | Thin vertical slices; pairs with PLAN.md phases and the one-task-one-PR rule. |
| `test-driven-development` | github | addyosmani/agent-skills | MIT | `2686b620fc` | Red-green-refactor; conformance fixtures and property tests (SPEC §6). |
| `code-review-and-quality` | github | addyosmani/agent-skills | MIT | `2686b620fc` | Multi-axis review before merge; used with the code-review built-in. |
| `code-simplification` | github | addyosmani/agent-skills | MIT | `2686b620fc` | Refactor for clarity without behaviour change; "improve upstream code when lifting". |
| `constraint-driven-development` | github | addyosmani/agent-skills | MIT | `2686b620fc` | Written quality bar that agents may not quietly lower (zero-dep core, determinism, a11y). |
| `context-engineering` | github | addyosmani/agent-skills | MIT | `2686b620fc` | Keep agent context lean — fits Agent Skills progressive disclosure (≤500-line SKILL.md). |
| `documentation-and-adrs` | github | addyosmani/agent-skills | MIT | `2686b620fc` | ADRs for the decisions listed in T-002 (parser strategy, YAML subset, stack). |
| `api-and-interface-design` | github | addyosmani/agent-skills | MIT | `2686b620fc` | Stable CLI/AST/package interfaces (@mdui/*) and diagnostics contracts. |
| `source-driven-development` | github | addyosmani/agent-skills | MIT | `2686b620fc` | Ground decisions in official docs — the verification culture of COMPETITIVE_RESEARCH §2.4; includes prompt-injection guidance for fetched content. |
| `security-and-hardening` | github | addyosmani/agent-skills | MIT | `2686b620fc` | Path sandboxing, URL schemes, injection (AGT-04, SPEC §7). |
| `git-workflow-and-versioning` | github | addyosmani/agent-skills | MIT | `2686b620fc` | Trunk-based, small commits, versioning; submodule-heavy repo hygiene. |
| `using-agent-skills` | github | addyosmani/agent-skills | MIT | `2686b620fc` | Entry-point skill: how to discover and invoke the others. |
| `doubt-driven-development` | github | addyosmani/agent-skills | MIT | `2686b620fc` | Fresh-context adversarial review of non-trivial decisions — counters over-claiming (novelty claims, estimates). |
| `verification-before-completion` | github | obra/superpowers | MIT | `8ca22dba9a` | No "done" claims without evidence — mirrors the repo's Done-when/Verify discipline. |
| `systematic-debugging` | github | obra/superpowers | MIT | `8ca22dba9a` | Root-cause process for parser/grammar parity failures and flaky oracle tests. |
| `dispatching-parallel-agents` | github | obra/superpowers | MIT | `8ca22dba9a` | PLAN §6 parallel streams: independent tasks to independent agents. |
| `using-git-worktrees` | github | obra/superpowers | MIT | `8ca22dba9a` | Isolated workspaces for parallel task PRs. |
| `receiving-code-review` | github | obra/superpowers | MIT | `8ca22dba9a` | Evaluate review feedback technically before applying (PLAN driving-to-green rules). |
| `requesting-code-review` | github | obra/superpowers | MIT | `8ca22dba9a` | Structured review requests per task PR. |
| `writing-skills` | github | obra/superpowers | MIT | `8ca22dba9a` | Authoring and testing skills (T-053 skill restructure). Note: SKILL.md is long (>500 lines) — read selectively. |
| `property-testing` | github | nyxandro/property-testing-skill | MIT | `786d52b321` | fast-check properties: fmt idempotence, streaming≡batch, grammar parity (SPEC §6). |
| `a11y-playwright-testing` | github | fugazi/test-automation-skills-agents | MIT | `2777b1c43c` | Playwright + axe a11y/ARIA tests — Oracle (NOV-02) and preview a11y gates. |
| `webapp-testing` | github | anthropics/skills | Apache-2.0 (webapp-testing/LICENSE.txt) | `8a1541c4a3` | Playwright driver patterns + with_server.py helper for T-041/T-077 e2e. |
| `skill-creator` | installed | installed set | Apache-2.0 (LICENSE.txt) | `—` | Create/evaluate skills; used for T-053 and the project skill evals. |
| `mcp-builder` | installed | installed set | Apache-2.0 (LICENSE.txt) | `—` | Build/evaluate MCP servers — T-062/T-081. |
| `frontend-design` | installed | installed set | Apache-2.0 (LICENSE.txt) | `—` | Distinctive UI guidance for the preview renderer and docs site (T-040, T-092). |
| `accessibility` | installed | installed set | MIT (frontmatter) | `—` | WCAG 2.2 audit knowledge for QLT-03 rules and preview chrome. |
| `web-quality-audit` | installed | installed set | MIT (frontmatter) | `—` | Lighthouse-style audit workflow for docs site/playground (T-092). |
| `best-practices` | installed | installed set | MIT (frontmatter) | `—` | Web security/compat/code-quality checklist for docs site and renderer. |
| `markdown-ui-dsl` | project | this repo | MIT | `—` | This project's own skill (source of truth: skills/markdown-ui-dsl). |

Shared reference checklists used by the addyosmani skills are installed as `.agents/references/` and `.claude/references/` (security, performance, accessibility, testing, observability, orchestration, definition-of-done).

## 3. Index of installed skills (authoring-environment snapshot, 110 skills)

The skills available to the authoring session were enumerated from `/root/.claude/skills`, `/mnt/skills/public` and `/mnt/skills/examples`. This is a **snapshot of one environment**, not something the repository can reproduce; it records what was considered.

### 3.1 Vendored into the project (6)

| Skill | Lines · files | Licence evidence |
|---|---|---|
| `accessibility` | 451 · 3 | MIT (frontmatter) |
| `best-practices` | 642 · 1 | MIT (frontmatter) |
| `frontend-design` | 72 · 2 | Apache-2.0 (LICENSE.txt) |
| `mcp-builder` | 237 · 10 | Apache-2.0 (LICENSE.txt) |
| `skill-creator` | 486 · 18 | Apache-2.0 (LICENSE.txt) |
| `web-quality-audit` | 173 · 2 | MIT (frontmatter) |

### 3.2 Relevant but **not** vendored

Reasons are licence/provenance (a skill with no licence information is not redistributed in a possibly-public repository) or timing (vendor when the task starts).

| Skill | Source in environment | Why relevant / why not vendored |
|---|---|---|
| `deep-research` | synced, mnt-examples | Competitive-research cadence (PLAN §13); licence/provenance not shown locally → not redistributed |
| `wai-aria-compliance` | synced | ARIA roles/states for the renderer and Oracle mapping (T-076); licence unknown |
| `web-design-guidelines` | synced | UI guideline review for preview/docs; licence unknown |
| `ux-research` | synced | Validates NOV-04 heuristic defaults with real research; licence unknown |
| `svg-design` | synced | SVG renderer craft (T-094/T-111); licence unknown |
| `doc-coauthoring` | mnt-examples | Spec/RFC co-authoring workflow (Anthropic example skill; licence not stated in the skill folder) |
| `session-start-hook` | local | Set up SessionStart hooks so Claude Code on the web can run lint/tests (do when T-002/T-003 land); harness-provided |
| `performance` | synced | MIT — web performance for docs site/playground (T-092); vendor when needed |
| `core-web-vitals` | synced | MIT — docs site LCP/INP/CLS (T-092); vendor when needed |
| `seo` | synced | MIT — docs site discoverability (T-092); vendor when needed |
| `vercel-react-best-practices` | synced | MIT — React renderer/runtime (T-105); 76 files, vendor when needed |
| `vercel-composition-patterns` | synced | MIT — React renderer component API (T-105); vendor when needed |
| `chrome-devtools` | synced | Browser debugging of the preview server (T-041); licence unknown |
| `theme-factory` | synced, mnt-examples | Styling themes for renderer styles; Anthropic example (terms in LICENSE) |
| `docs` | synced, mnt-examples | Claude Docs connector skill — only if docs are published there |
| `google-workspace` | synced, mnt-examples | Only if specs are shared via Google Docs |

### 3.3 Proprietary — present but not redistributable

`artifact-emulator`, `brand-guidelines`, `built-in-browser`, `canvas-design`, `chrome-browser`, `computer-use`, `docx`, `file-reading`, `pdf`, `pdf-reading`, `pptx`, `product-self-knowledge`, `xlsx`. Their SKILL.md frontmatter marks them proprietary or terms-restricted; they remain available in the authoring environment only.

### 3.4 Not relevant to this project

- **3D / WebGL / physics visualisers** (22): `aframe-webxr`, `babylonjs-engine`, `blender-web-pipeline`, `playcanvas-engine`, `pixijs-2d`, `react-three-fiber`, `spline-interactive`, `substance-3d-texturing`, `threejs-webgl`, `web3d-integration-patterns`, `lightweight-3d-effects`, `awwwards-3d`, `biefeld-brown-electrogravitics-visualizer`, `hutchison-effect-visualizer`, `leedskalnin-magnetic-current-visualizer`, `repulsine-aerodynamics-visualizer`, `rife-resonance-visualizer`, `russell-cosmogony-visualizer`, `schappeller-magnetism-visualizer`, `schauberger-vortex-flow-visualizer`, `searl-effect-generator-visualizer`, `tesla-standing-wave-visualizer`
- **Animation / motion / scroll** (17): `animated-component-libraries`, `animejs`, `barba-js`, `gsap-scrolltrigger`, `locomotive-scroll`, `lottie-animations`, `motion-framer`, `paper-shaders`, `react-spring-physics`, `rive-interactive`, `scroll-reveal-libraries`, `grainient-gradient-generation`, `vercel-react-view-transitions`, `remotion-best-practices`, `algorithmic-art`, `slack-gif-creator`, `paint`
- **Brand / marketing / product** (11): `brand-discovery`, `logo-design`, `interactive-product-tour`, `upgrade-flow-design`, `programmatic-seo`, `hyper-premium-ui-ux`, `modern-web-design`, `design-exploration`, `whop-metered-billing`, `clerk-auth`, `pqc-first`
- **Platforms / deployment** (6): `expo`, `fly-deployment`, `migrate-radix-to-base`, `shadcn`, `vercel-optimize`, `vercel-react-native-skills`
- **Consumer / personal tasks** (19): `benepass-reimbursement`, `call-to-book`, `cancel-unsubscribe`, `event-planning`, `file-expenses`, `file-form`, `financial-calculator`, `grocery-shopping`, `hire-help`, `meal-delivery`, `prescription-refill`, `return-refund`, `morning`, `import-memory`, `learn`, `setup-writing-style`, `internal-comms`, `skill-downloader`, `web-artifacts-builder`


## 4. How the 25 new skills were found

Searches covered: spec-driven development and planning skills (the `/spec-driven-development` and `/planning-and-task-breakdown` commands used at the start of this program come from `addyosmani/agent-skills`), the most-starred Claude Code skill frameworks (`obra/superpowers`), Anthropic's public skills repo, security-focused collections (Trail of Bits), testing and property-based-testing skills, accessibility/Playwright skills, skill-authoring guides, and curated indexes (VoltAgent/awesome-agent-skills and others) for discovery. Eleven candidate repositories were shallow-cloned into scratch space; **82 skills across eight of them were inventoried individually** (name, description, size, bundled files) and the two very large registries (Trail of Bits, 85 skills; tech-leads-club, 92) were assessed at repository/licence level, before the final 25 were chosen against this project's needs (SPEC/PLAN/TASKS, TDD + property tests, a11y oracle, security boundaries, parallel streams).

### Candidates deliberately **not** installed

| Candidate | Reason |
|---|---|
| trailofbits/skills (differential-review, insecure-defaults, static-analysis, …) | **CC BY-SA 4.0** — share-alike would attach to adapted copies in an MIT repository; use the upstream plugin directly if wanted |
| mgechev/skills-best-practices | No licence file → cannot be redistributed |
| obra/superpowers `executing-plans` | Its scripts require the sibling `subagent-driven-development` skill (not installed) → replaced by `receiving-code-review` |
| obra/superpowers `brainstorming`, `writing-plans` | Overlap with `spec-driven-development` / `planning-and-task-breakdown`; one skill per job |
| adewale/testing-best-practices | Overlaps `test-driven-development` + `property-testing`; no LICENSE file in the cloned root |
| testdino-hq/playwright-skill (79 files) | Large; revisit when T-077 e2e starts |
| fugazi other QA skills (Selenium/Java/ISTQB) | Not applicable to a TypeScript/Playwright toolchain |
| tech-leads-club/agent-skills (92-skill registry), VoltAgent/awesome-agent-skills | Discovery sources only; mixed licences — vet individually |

## 5. Vetting protocol (mandatory for any new third-party skill)

A skill is **instructions an agent will obey and, sometimes, scripts it will run** — treat it as untrusted code.

1. **Provenance:** clone shallow, record repo + commit; prefer maintained, widely used sources.
2. **Licence:** must permit redistribution under this repo's terms (MIT/Apache/BSD). Refuse share-alike/copyleft/none.
3. **Read everything:** every `SKILL.md`, reference file and script. Look for hidden instructions ("ignore previous…", secrecy), exfiltration, network calls, destructive commands, credential access.
4. **Automated audit:** `python3 scripts/skills.py audit` lists non-Markdown files and risky-pattern lines for review.
5. **Dependencies:** cross-skill/path references must resolve (e.g. `../../references/*` → install the shared folder; sibling-skill scripts → install or drop).
6. **Validate:** `skills.py validate` and `skills-ref validate`; keep `SKILL.md` ≤ 500 lines where possible.
7. **Pin:** add to `.agents/skills-manifest.json` with commit, licence, vetting date and tree hash; `skills.py install` refuses a source whose hash differs from the manifest.
8. **Copy to both folders** via `skills.py install`; `skills.py verify` must pass.

### Results for the 25 + 6

- **No** network fetches, credential access, obfuscation, hidden-instruction or exfiltration patterns found in any SKILL.md or reference file. The only prompt-injection phrase hit is `source-driven-development`'s *defensive* guidance about directives in fetched content.
- Executable files (all read in full): `systematic-debugging/find-polluter.sh` (bisects tests with `npm test`), `systematic-debugging/condition-based-waiting-example.ts` (example), `writing-skills/render-graphs.js` (calls local graphviz `dot`), `webapp-testing/scripts/with_server.py` + 3 examples (starts the user-supplied dev server, local Playwright), `web-quality-audit/scripts/analyze.sh` (local static analysis), `skill-creator/scripts/*` (local eval tooling that shells out to the `claude` CLI), `mcp-builder/scripts/*` (evaluation harness that connects to MCP servers and an LLM API **when run** — needs keys and network; never run automatically).
- **Policy:** bundled scripts are not executed by installation; run them only deliberately, in a sandbox, after reading them.
- `writing-skills/SKILL.md` exceeds 500 lines (681) — read selectively; flagged by `skills.py validate`.

## 6. Adding, updating, removing

```bash
# add: vet per §5, then add an entry (tier=github, source_repo, source_path, commit, license, why) and its tree hash
python3 scripts/skills.py install --only <name>      # copies into .agents/skills and .claude/skills
python3 scripts/skills.py verify && python3 scripts/skills.py validate
# own skill: edit skills/markdown-ui-dsl/, then
python3 scripts/skills.py sync
```
