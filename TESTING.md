# Testing Markdown-UI DSL

This project is tested at five levels. Only the last is non-deterministic, and it is scored with deterministic checks.

| Level | What | Run |
|---|---|---|
| Unit and property | parser, formatter, lint rules (each with a failing and a passing fixture), tokens, catalog, grammar, sync, Oracle, MCP, CLI; fast-check properties (print stability, parse never throws) | `pnpm test` |
| Conformance | language fixtures in `packages/spec/conformance/` run by the reference parser and a Python stub runner | `pnpm test`, `node scripts/conformance-harness.mjs` |
| Gates | typecheck, lint, format, build, example lint, traceability, skills, reference manifest | `pnpm check` and the commands in `AGENTS.md` |
| Real engines and browsers | grammar parity fuzz (100k strings per DSL version), grammar engines (Lark, llguidance, xgrammar, llama.cpp), MCP clients (official TS and Python SDKs), axe-core on rendered output, the Oracle benchmark | `pnpm parity`, `python3 scripts/engine-smoke.py`, `pnpm test:e2e`, `node scripts/eval-nov02.mjs --check` |
| LLM evals | do models write valid DSL, follow the skill, keep a spec in sync, and resist injection in a spec? | `node scripts/eval-llm.mjs` (see [`docs/EVALS.md`](docs/EVALS.md)) |

## LLM evals

Because models are non-deterministic, nothing is matched against an exact string. Each answer is parsed and linted by this project's own toolchain, plus a few content assertions per task:

- **valid**: `mdui lint` reports no errors; **nesting errors**: unclosed block, orphan closer, mismatched typed closer; **DSL only**: no framework code or markup; **catalog adherence** with a catalog; **injection**: hostile text inside a spec is not obeyed.
- 50 tasks: 32 generation prompts (30 v1/v2 screens), 8 sync scenarios (edit a spec to match changed code), 10 injection prompts.
- Arms: no context, the shipped skill, the generated prompt (`mdui prompt`), each optionally with a grammar. Context files can cost more than they help (see ADR-006), so cost is measured next to success.
- Providers: Ollama, llama.cpp `llama-server` (the one that enforces grammars), any OpenAI-compatible endpoint, and a replay provider for dry runs. A panel of three or more models is just `--model a,b,c`.
- `--min-pass` / `--min-valid` make the run exit 1 below a threshold, for CI. Results with the model, date, sample size and 95% intervals go to `evals/`; `evals/BASELINE.md` and `evals/NOV-03.md` say **NOT RUN** until a real run replaces them.

The dry run (`--provider mock --replay evals/fixtures/reference-answers.json`) replays hand-written synthetic answers to prove the harness and tasks work. It is never a result.

## Manual acceptance checklists (release)

The three scenarios below are kept as manual acceptance checks to run in an AI IDE before a release; they check *code generation behaviour* that the automated evals above do not.

### Simulation scenarios

To verify the agent correctly understands the DSL syntax and your specific `design-systems/` rules, simulate a code-generation session in your AI IDE (Copilot, Cursor, etc.) or CLI using the following steps.

### 1. Test: Translation & Theming Adherence
**Objective:** Prove the agent understands layout primitives (`||| COLUMN |||`, `=== ROW ===`) and maps them to the appropriate framework tokens.

**Prompt to the AI:**
> "Using the `markdown-ui-dsl` skill (`skills/markdown-ui-dsl/SKILL.md`), generate the UI component described in `examples/login-form.ui.md`."

**Evaluation Checklist (Manual or Scripted):**
- [ ] Did the agent inject a spec reference comment at the top of the file? (e.g. `// UI Spec: wireframes/login-form.ui.md`)
- [ ] Did the `||| COLUMN |||` correctly map to a visual vertical stack in the target framework?
- [ ] Did the nested `=== ROW ===` block generate a valid flex-row or horizontal container?
- [ ] Were the specific design tokens mandated in the referenced design-system file (e.g. `examples/design-systems/web-tailwind.md`) applied?

### 2. Test: Two-Way Binding (Code -> Spec)
**Objective:** Prove the agent will surgically update the Markdown wireframe when a change is requested on the code side.

**Prompt to the AI:**
> "Open the generated login code from the previous step. Add a 'Login with Google' secondary button directly beneath the main login button, and be sure to sync the wireframe."

**Evaluation Checklist:**
- [ ] Was the code updated successfully with the new button?
- [ ] Did the agent use the `// UI Spec:` comment to navigate back to `login-form.ui.md`?
- [ ] Was the `.ui.md` syntax correctly updated? (e.g., did it insert `[ Login with Google ](#google)` directly below `[ Login ](#login)` without destroying the rest of the DSL layout?)

### 3. Test: Natural Language Directives
**Objective:** Prove the agent understands Markdown blockquotes (`>`) as structural hints rather than literal text.

**Prompt to the AI:**
> "Add a text input for 'Search...' at the top of the login form, but use an inline blockquote directive `> align right` above it in the wireframe. Generate the updated layout."

**Evaluation Checklist:**
- [ ] Does the `.ui.md` feature the `> align right` syntax exactly as formatted?
- [ ] Does the generated code use CSS/Framework-specific properties (e.g., `justify-end`, `text-align: right`, or `Spacer`) to physically push the search bar to the right side of the screen?

---

### Future: Automated LLM Evals
As this repository matures, we may implement automated LLM-as-a-judge pipelines (using tools like Promptfoo, Braintrust, or Langchain). If you are submitting a PR to introduce an automated eval pipeline, please ensure the evaluation strictly asserts layout semantics (checking for the existence of required components or AST trees) rather than flakey exact-string matching.