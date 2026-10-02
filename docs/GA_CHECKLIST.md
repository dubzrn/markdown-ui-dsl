# GA checklist status (PLAN §7)

Honest status per checkpoint item, with evidence. **Met** = measured in this repository; **Partial** = built, with a stated gap; **Open** = not done. This is not a sign-off: the plan asks for a maintainer to sign off, and several items need a human, a model, a network or a published package.

## Checkpoint 4 (GA candidate) and 5 (GA)

| Item | Status | Evidence / gap |
|---|---|---|
| NOV-01 ≥ 95% on ≥ 200 cases | Met | 888/888 on 400 generated cases (`evals/NOV-01.md`); synthetic screens only |
| NOV-01 zero data loss over ≥ 1,000 apply cases; refuses without `--confirm` | Partial | refusal tested; apply is verified by re-extraction and journaled; the ≥ 1,000-case apply run is not separately recorded |
| NOV-02 recall ≥ 90%, FP ≤ 5%, ≤ 5 s/screen | Met | 237/240 = 98.8%, 0/240 FP, slowest 49 ms (`evals/NOV-02.md`); the apps are this project's own renderings |
| NOV-04 ≥ 12 rules, recall ≥ 95%, 0 FP, ≥ 4 post-code | Met | 14 rules, 31/31, 0/15 FP (`evals/NOV-04.md`) |
| ≥ 250 conformance fixtures; third-language runner | Partial | 494 fixtures, Python runner (`docs/CONFORMANCE.md`); the implementation under test is the TS reference, no independent second implementation |
| NOV-03 benchmark with measured baseline | **Open** | harness built (`docs/EVALS.md`); **no model run**, so no constrained-vs-unconstrained result |
| Eval harness on ≥ 3 agents; v1 nesting-error baseline (B-03) | **Open** | needs model access (`evals/BASELINE.md` is a NOT RUN stub) |
| Skill works with no tooling (eval-checked) | **Open** | needs a model run |
| MCP verified with ≥ 2 clients | Partial | official SDK clients in JS and Python; Claude Desktop, Cursor, VS Code **not** run by hand |
| A2UI v1.0 / json-render exports validate against pinned schemas | Met | schemas vendored at `102ec1a04975`; `validateSpec` from `@json-render/core@0.21.0`; not rendered by upstream renderers |
| Docs site + playground "live" | Partial | built, link-checked, axe-clean, e2e-tested; **not deployed** (publishing needs your go-ahead) |
| Every diagnostic code documented | Met | 84 pages, enforced by `build-site.mjs --check` |
| Security review | Met (author review) | `docs/SECURITY_REVIEW.md`; 11 findings fixed; no independent audit |
| Novelty re-check; source re-verification of every C/U entry | **Open** | needs web access the build sandbox does not have |
| `mdui` fence via remark and markdown-it | Met | tested with the real libraries |
| Generated SVG verified in a GitHub README | **Open** | no sandbox repository / cannot view github.com rendering |
| Token benchmark, all scenarios, raw counts | Met | `evals/TOKENS.md`; A2UI Express not measured; mdui files authored by this project |
| Clean-room install of CLI, MCP, skill | Partial | `scripts/clean-room-install.mjs` packs every package, installs the tarballs into an empty directory with npm and runs `mdui` and `mdui-mcp` (passes; also a gate in the publish workflow). Install **from the registry** is untested until the first publish; the skill is not part of an npm package |
| Migration guide; licence decision (A3) | Met | `docs/MIGRATION.md`; `docs/adr/ADR-007-licence-and-package-names.md` (VRIL LABS Open Source License v1.0, upstream MIT notice kept in `NOTICE`) |
| Publish workflow | Partial | `.github/workflows/publish.yml` and `docs/RELEASING.md`; **never run** (needs the owner's token and a GitHub run). Run it as a dry run first |
| Full traceability pass | Met | 48 features · 55 requirements · 84 tasks · 0 problems |
| Known limitations documented | Partial | per document (`docs/*.md` "Limits"/"Not verified" sections); no single page |

## Earlier checkpoints, items that are not simply "green"

| Item | Status | Note |
|---|---|---|
| SP-1 / SP-2 / SP-3 results recorded | Partial | only SP-4 has a spike document. SP-1 is answered by the Oracle (login-form baseline 100%), SP-2 by the engine matrix in `docs/GRAMMAR.md`; SP-3 (anchor stability ≥ 95% across edits) has unit tests but **no percentage was measured** |
| Preview update ≤ 500 ms | Met | median 58 ms, max 64 ms over 10 edits |
| Preview chrome passes axe | Met | e2e, light and dark |
| WCAG criterion mapping | Partial | number, title and level checked against the W3C source commit `71c891a`; normative wording not compared |
| RFC-0001 §7 (readability review and simplifications) maintainer read | Met | approved by the repository owner, 2026-10-02 (reported in the working session) |

## What needs you

Run `scripts/eval-llm.mjs` against a model (T-061/T-063), approve publishing and the licence decision (T-098), try the MCP server in Claude Desktop / Cursor / VS Code, and view a generated SVG in a GitHub README. Re-verifying the research sources needs network access to the sources.
