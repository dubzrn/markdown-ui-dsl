# Baseline: how models write the DSL today (B-03 hypothesis)

**Status: NOT RUN. No measurement exists yet.** The harness is built and tested (`docs/EVALS.md`), but no language model was reachable from the build environment (the sandbox has no network route to Ollama or any model API), so this file has no numbers on purpose. It is overwritten by a real run.

B-03 hypothesises that models make block-nesting errors (unclosed blocks, orphan closers) when writing v1 DSL. To measure it on your machine:

```bash
node scripts/eval-llm.mjs --provider ollama --model <model> --arms none,skill,prompt --seeds 1,2,3 \
  --out evals/results/baseline.json --baseline
```

That writes this file with the nesting-error rate per arm, the sample size and a 95% interval. Until then, nothing here should be quoted.
