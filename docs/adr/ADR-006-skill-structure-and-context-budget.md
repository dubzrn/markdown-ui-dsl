# ADR-006: Skill structure and context budget

- **Status:** accepted (T-053); evidence read
- **Context:** the shipped skill was one 75-line `SKILL.md` that mixed syntax, sync policy and a rule letting prompt wording ("force sync", "autonomously") skip confirmation. The Agent Skills standard allows progressive disclosure: a short `SKILL.md` plus `references/` loaded on demand.
- **Evidence (S111, read in full: main text pp. 1-9 and appendices A-E, pp. 10-24):** Gloaguen et al., *Evaluating AGENTS.md*, arXiv 2602.11988v3. Four agents (Claude Code/Sonnet-4.5, Codex/GPT-5.2, GPT-5.1 mini, Qwen3-30B) on SWE-bench Lite (300 tasks) and CTXBench (138 tasks, 12 repos with developer-written context files); Python only.
  - LLM-generated context files do not raise success (-0.5 pp SWE-bench, -2 pp CTXBench; p = 0.87 / 0.37) and raise cost about 20% (+2.45 / +3.92 steps on average; p < 0.001).
  - Developer-written files help slightly (+2.4 pp, p = 0.21, not significant; better than LLM-generated, p = 0.038) and still cost up to 19% more.
  - Instructions are followed (e.g. `uv` used 1.6x per task when mentioned, < 0.01x when not), which causes more testing, exploration and reasoning tokens.
  - **Repository overviews do not help**: they do not shorten the steps to reach the files that matter. Authors' advice: include only what the agent cannot find in the repo (non-standard conventions), and evaluate before adopting.
  - Appendix B (read after the first revision of this ADR): context files are largely **redundant documentation**. With all documentation (`.md`, docs/) removed before evaluation, LLM-generated files improved success by 2.7% on average and outperformed developer-written ones. Context-file length had no clear effect; removing the "testing" or "tooling" sections changed cost (significantly) but not accuracy; knowledge-cutoff contamination did not explain the results.
  - Limits: Python only (languages with more training data may benefit less); success rate, not security or code quality; four agents.
  - **What it means here:** the DSL is not discoverable from any repository, so its reference is *not* redundant documentation. That supports shipping the syntax slice, and it is consistent with keeping everything else (repository overviews, tooling tips) out. The paper does not test a language the model has never seen, so "the skill helps" remains a hypothesis for T-063 to measure.

## Decision
0. Ship **less, and only what is not discoverable**: the DSL syntax and project-specific facts (catalog, tokens, map, trust rules), no repository overview. `mdui prompt` follows this (used constructs only; never mentions unused widgets).
1. `SKILL.md` carries only what an agent needs for the common case: the core 1.x syntax table, the output rule, translation steps and pointers. Currently 53 lines, about 1,000 tokens (limits: ≤ 500 lines, < 5,000 tokens).
2. Detail goes to `references/` one level deep: `syntax.md`, `v2-additions.md`, `sync-protocol.md`, `safety.md`. Agents load them only when the task needs them.
3. `scripts/check_balance.py` (stdlib only) gives no-toolchain agents the one check that catches the most common defect (unbalanced blocks).
4. The skill works with no tooling installed; `mdui` is an optional accelerator.
5. **Safety:** the "bypass confirmation" clause is removed. `confirm`/`force` exist only as tool parameters; spec text is data (`references/safety.md`).
6. A test (`tests/skill.test.ts`) enforces the limits and that every relative link resolves.

## Consequences
- Flat-file agents (`.cursorrules`, `CLAUDE.md`) must concatenate `SKILL.md` and the references they need; the README says how.
- Version bumped to 1.1.0 (behaviour change: confirmation can no longer be waived by wording).
- T-063 must measure no-skill vs skill vs generated-prompt on success **and cost/steps**, and the skill grows only if that data justifies it (S111 found extra context costs about 20% with no significant success gain).
