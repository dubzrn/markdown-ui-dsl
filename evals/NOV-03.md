# NOV-03 constrained-decoding benchmark

**Status: NOT RUN. There is no measured constrained-versus-unconstrained result.** The benchmark is implemented and its machinery is tested, but no language model was reachable from the build environment, so no model has been run with or without a grammar. What *has* been measured is that the emitted grammar is accepted by Lark, llguidance, xgrammar and llama.cpp's matcher and that 200,000 generated strings parse with zero errors (`docs/GRAMMAR.md`). That shows the grammar is correct; it does not show a model writes better documents under it.

To run it (needs `llama-server` from llama.cpp, the only supported engine here that takes a GBNF grammar):

```bash
llama-server -m model.gguf --port 8080 &
node scripts/eval-llm.mjs --provider llamacpp --label mymodel \
  --arms none,none+grammar,skill,skill+grammar --seeds 1,2,3 --nov03 --out evals/results/nov03.json
```

It writes this file with, per arm: structural validity, nesting errors, DSL-only compliance, pass rate (with 95% Wilson intervals), token counts, and a paired comparison (exact sign test) of grammar versus no grammar. Ollama's API takes a JSON-schema `format` but no GBNF, so Ollama can run the unconstrained arms only. If your Ollama model is a GGUF, the same file can be served by `llama-server` for the constrained arms (Ollama keeps its weights as GGUF blobs under its models directory; unverified here).
