# SP-4 — Token-cost baseline (mdui vs A2UI v1.0 JSON)

Status: partial (A2UI only) · Date: 2026-10-01 · Reproduce: `npm i --prefix .tools/bench gpt-tokenizer && node bench/sp4/measure.mjs`

## Method

- **Scenarios** are four of A2UI's own maintainer-authored gallery examples (`reference/protocols/a2ui/catalogs/basic/v1/examples/`):
  `00_simple-login-form`, `05_product-card`, `07_task-card`, `08_user-profile` — chosen so the A2UI side is not written by us.
- **mdui side** (`bench/sp4/*.ui.md`) is hand-written by us as the equivalent wireframe, with the example's literal data inlined.
  All four parse with zero diagnostics.
- **Tokenizers:** `gpt-tokenizer` 4.0.0, `o200k_base` and `cl100k_base`. These are OpenAI encodings, **not Claude's tokenizer**; ratios should transfer roughly, absolute counts will not.
- A2UI measured three ways: all messages minified (what an agent emits), pretty-printed, and components-only (most generous: drops the `createSurface`/`updateDataModel` envelopes and data values).

## Result (o200k_base)

| scenario | mdui | A2UI minified | Δ | A2UI components-only | Δ |
|---|---|---|---|---|---|
| simple login form | 29 | 233 | −87.6% | 164 | −82.3% |
| product card | 54 | 495 | −89.1% | 342 | −84.2% |
| task card | 65 | 339 | −80.8% | 206 | −68.4% |
| user profile | 85 | 576 | −85.2% | 414 | −79.5% |
| **total** | **233** | **1643** | **−85.8%** | | |

`cl100k_base` totals: 244 vs 1591 (−84.7%).

## What this does and does not show

- mdui is far cheaper to *emit* for static structure; the gap is larger than OpenUI Lang's published −52.8% vs JSON because that comparison is between two compact formats, while A2UI's adjacency-list JSON repeats ids and keys.
- **Not like-for-like in capability.** A2UI examples carry data bindings (`{"path":"/email"}`), formatting calls, validation `checks`, and action contexts that mdui 1.x cannot express. The 2.0 additions (`{{path}}` binding, attributes, actions registry — LNG-05/06/11) will add tokens back; SP-4 must be re-run after RFC-0001 syntax is drafted to measure the real cost of equivalent capability.
- The mdui versions are wireframes with example values inlined; production A2UI would typically stream data separately.
- Only 4 scenarios, one competitor, hand-authored mdui side, a non-Claude tokenizer: this is a baseline for the decision, **not** a publishable benchmark (TLS-12 will do the named-tokenizer, multi-competitor version with json-render and OpenUI Lang).

## Decisions fed to RFC-0001

1. Keep the 2.0 surface syntax terse: every new construct is measured in tokens against the equivalent A2UI JSON; target ≥ 60% saving on the capability-matched scenario set.
2. Data binding costs ~6 tokens per `{{path}}` use in A2UI-equivalent form (`{"path":"/x"}`); `{{x}}` should stay ≤ 4.
3. Re-run SP-4 with: login form + validation, product card with bindings, task card with actions — once T-020..T-023 land.
