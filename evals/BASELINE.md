# Baseline: how models write the DSL today (B-03 hypothesis)

Run on 2026-10-02 with openai:gemma-4-26b-a4b-it; 50 tasks x 3 seed(s) x 3 arm(s), temperature 0.

B-03 hypothesised that models make block-nesting errors when writing v1 without help. "Nesting errors" below is the share of answers with an unclosed block, orphan closer or mismatched typed closer. Rates carry their sample size; intervals are 95% Wilson.

| Model | Arm | n | Pass | Pass 95% CI | Valid | Nesting errors | DSL only | Mean prompt tok | Mean output tok | Provider errors |
|---|---|---|---|---|---|---|---|---|---|---|
| openai:gemma-4-26b-a4b-it | none | 150 | 26% | 20-34% | 97% | 0% | 99% | 78 | 133 | 0 |
| openai:gemma-4-26b-a4b-it | skill | 150 | 43% | 35-51% | 55% | 44% | 99% | 2858 | 125 | 0 |
| openai:gemma-4-26b-a4b-it | prompt | 150 | 38% | 31-46% | 49% | 51% | 100% | 829 | 136 | 0 |

***

| Model | Arm | n | Pass | Pass 95% CI | Valid | Nesting errors | DSL only | Mean prompt tok | Mean output tok | Provider errors |
|---|---|---|---|---|---|---|---|---|---|---|
| ollama:ornith-1.5:9b | none | 150 | 8% | 5-13% | 96% | 0% | 74% | 75 | 764 | 0 |
| ollama:ornith-1.5:9b | skill | 150 | 32% | 25-40% | 60% | 40% | 100% | 2672 | 440 | 0 |
| ollama:ornith-1.5:9b | prompt | 150 | 50% | 42-58% | 80% | 16% | 100% | 822 | 318 | 0 |

Raw answers: re-score with `--replay`. Not a benchmark of the models in general: one task set, this project's own scoring.
