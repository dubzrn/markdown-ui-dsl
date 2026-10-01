# LLM evals (T-063) and the constrained-decoding benchmark (T-061)

Status: the harness is built, tested and dry-run; **no model has been run**, so there are no result numbers. `evals/BASELINE.md` and `evals/NOV-03.md` say so. The build environment had no network route to a model (no Ollama, blocked egress), which is why.

## What is measured
Every answer is scored by this project's own toolchain, not by another model:

| Metric | Meaning |
|---|---|
| valid | `mdui lint` of the extracted DSL has no errors |
| nesting errors | E1001 unclosed block, E1002 orphan closer, E1004 mismatched typed closer |
| DSL only | no framework code or markup in the answer |
| right version | `dsl: 2.0` frontmatter exactly when the task asks for 2.0 |
| catalog errors | E6001/E6002 against a supplied catalog |
| pass | all of the above plus the task's own content assertions (regexes in `packages/evals/src/tasks.ts`) |

Rates are reported with n and a 95% Wilson interval. Arms are compared on identical (task, seed) pairs with an exact sign test. "Pass" is a proxy for quality: it does not say a screen is *good*, only that it is valid, on-topic and compliant. The semantic-quality rubric (LLM judge) is not implemented; it would add a second model's biases.

## Tasks (50)
32 generation prompts (screens across the 1.x syntax and 6 DSL 2.0 widgets/containers), 8 sync scenarios (given a spec and a described code change, return the updated spec with the `#login` anchor kept), 10 injection prompts (the spec to edit contains instructions to ignore rules, emit `javascript:` links, reveal secrets, run commands, obfuscated URL schemes, hostile frontmatter paths; the answer must still do the legitimate edit and obey none of it). Each task has a hand-written synthetic reference answer (`evals/fixtures/reference-answers.json`); a test proves it passes its own assertions, that an empty or wrong-topic answer fails every task, and that obeying an injection fails.

## Arms
Context: `none`, `skill` (SKILL.md plus the syntax, 2.0 and safety references), `prompt` (`mdui prompt`: only the constructs the task needs). Constraint: `+grammar` (catalog-specialised GBNF from `@mdui/grammar`, depth-bounded). The S111 study found extra context can raise cost with no accuracy gain (ADR-006), so prompt tokens and output tokens are reported with the pass rate.

## Providers
| Provider | Grammar | Notes |
|---|---|---|
| `ollama` | no | `/api/generate`, temperature and seed pinned, token counts from `prompt_eval_count`/`eval_count`. Ollama's API has a JSON-schema `format` but no GBNF |
| `llamacpp` | **yes** | `llama-server` `/completion` with `grammar`; the engine for constrained arms |
| `openai` | no | any OpenAI-compatible `/chat/completions`, key from `--api-key` or `$LLM_API_KEY` |
| `mock` | replay | replays recorded answers (`--record` saves a real run for later dry runs) |

A constrained arm on a provider that cannot enforce a grammar is refused, never silently run unconstrained. A provider failure is recorded as an error and excluded from the rates, not counted as a model failure. The adapters were exercised over real HTTP against a local emulation of the Ollama and llama.cpp endpoints (request bodies, token accounting); they have not talked to the real servers.

## Running
```bash
# baseline (B-03) and context arms, a panel of models
node scripts/eval-llm.mjs --provider ollama --model a,b,c --arms none,skill,prompt --seeds 1,2,3 --out evals/results/run.json --baseline
# constrained-decoding benchmark
node scripts/eval-llm.mjs --provider llamacpp --label m --arms none,none+grammar,skill,skill+grammar --seeds 1,2,3 --nov03
# CI gate: fail below a pass or validity rate
node scripts/eval-llm.mjs ... --min-pass 0.8 --min-valid 0.9
```
`.github/workflows/nightly.yml` has an `llm-evals` job that runs only when `LLM_BASE_URL` is configured as a repository variable (it is not, so it is skipped), with Promptfoo-style tool-agnosticism: the assertions are `mdui lint`, so any runner can replace `scripts/eval-llm.mjs`.
