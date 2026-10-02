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
Context: `none`, `skill` (SKILL.md plus the syntax, 2.0 and safety references), `prompt` (`mdui prompt`: only the constructs the task needs). Constraint: `+grammar` (catalog-specialised GBNF from `@vrillabs/mdui-grammar`, depth-bounded). The S111 study found extra context can raise cost with no accuracy gain (ADR-006), so prompt tokens and output tokens are reported with the pass rate.

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

## First measurements (2026-10-02)

Two models, 50 tasks x 3 seeds x 3 arms, temperature 0, no provider errors: `gemma-4-26b-a4b-it` through LiteLLM (`evals/BASELINE.md`) and `ornith-1.5:9b` through Ollama (`--num-ctx 8192`). Raw answers: `evals/results/`. Re-scored per task kind with `scripts/eval-rescore.mjs`: `evals/RESCORE-2026-10-02.md`.

**Read the per-kind rows, not the headline.** The 50 tasks are 32 *generate* (write a screen), 8 *sync* and 10 *inject*. Sync and inject are easy and pad the overall pass rate; generation is what the DSL is for. Numbers below are distinct answers only, last-block scorer.

| Model | Arm | Generate pass | Generate parses cleanly | Generate with nesting errors | Overall pass |
|---|---|--:|--:|--:|--:|
| gemma-4-26b-a4b-it | none | 4% (n=55) | 98% | 0% | 19% |
| | skill | 22% (n=58) | 34% | 66% | 39% |
| | prompt | 18% (n=33) | 21% | 79% | 40% |
| ornith-1.5:9b | none | 3% (n=32) | 97% | 0% | 24% |
| | skill | 31% (n=32) | 38% | 63% | 50% |
| | prompt | 59% (n=32) | 75% | 25% | 68% |

What it shows:

* **Unaided, neither model can write these screens** (1 pass of 32 generate tasks each). Unaided answers contain **no block opener at all** in any of the 32 generate tasks (checked), so their 0% nesting errors and 97% "valid" are vacuous: there are no blocks to unbalance. The B-03 hypothesis (models nest badly when unaided) is therefore *not testable* in the unaided arm, not refuted. Their failures are mostly invented primitives (E1302).
* **Given the skill or the prompt, the models attempt blocks and get the closers wrong**: 63-79% of generate answers have an unclosed block (E1001) or an orphan closer (E1002), and the dominant code is E1001 (about 45 per arm). Examples in the raw answers: invented closers such as `=== END --- ===` and `::: END --- :::` (mixing the three opener styles with `--- END ---`), nested ROWs left open, a closer line for a block that was never opened.
* **The generated prompt (`mdui prompt`) is not uniformly better than the skill**: best arm for ornith (59% generate pass, 25% nesting errors), worst for gemma (18%, 79%). With two models, that is a model-dependent effect, not a finding about the prompt.
* **The skill's content gain costs 37x the input tokens** (2,858 vs 78) for the first model. Both context arms leave most generation answers unparseable.
* This is the failure a generation grammar (NOV-03) targets, and it is also a design signal for the language: three opener styles plus a generic closer is easy to get wrong. Neither is measured yet. A constrained run needs the model on `llama-server`.

Method corrections found while reading the raw answers:

* **Seeds do not add samples at temperature 0**: all 150 (task, arm) cells of ornith have identical answers across the three seeds, and 94 of 150 for gemma. The effective n per arm is 50 tasks (ornith) or about 69 distinct answers (gemma), so the intervals in the generated tables are too narrow. Use `eval-rescore.mjs` ("distinct answers only").
* **Reasoning leakage**: `ornith-1.5:9b` writes its thinking (`</think>`) into the answer and sometimes writes a draft, says "wait", and writes a corrected document. The baseline scorer took the *first* fenced block, which penalised the self-corrected final one and counted the reasoning as part of the answer ("DSL only" 74% unaided). The scorer now drops text up to the last `</think>` and takes the last DSL block (`pick: "last"`); `--pick first` reproduces the original numbers (checked: it matches the as-run tables for both models). Pass rates move by a few points; the conclusions above hold under both.
* One model per arm family, one task set, this project's scoring, 2 of the 3 models the plan asks for.
