# ADR-006: Skill structure and context budget

- **Status:** accepted (T-053)
- **Context:** the shipped skill was one 75-line `SKILL.md` that mixed syntax, sync policy and a rule letting prompt wording ("force sync", "autonomously") skip confirmation. The Agent Skills standard allows progressive disclosure: a short `SKILL.md` plus `references/` loaded on demand.
- **Evidence status:** research source S111 (arXiv 2602.11988, "Are repository-level context files helpful for coding agents?") could **not be read**: the sandbox's egress policy denies arxiv.org (HTTP 403 on CONNECT). Only its title was reviewed. The decision below therefore rests on size measurements and on the cautious reading of that title, **not on S111's findings**. Revisit once the paper can be read; ADR status stays "accepted, evidence pending".

## Decision
1. `SKILL.md` carries only what an agent needs for the common case: the core 1.x syntax table, the output rule, translation steps and pointers. Currently 53 lines, about 1,000 tokens (limits: ≤ 500 lines, < 5,000 tokens).
2. Detail goes to `references/` one level deep: `syntax.md`, `v2-additions.md`, `sync-protocol.md`, `safety.md`. Agents load them only when the task needs them.
3. `scripts/check_balance.py` (stdlib only) gives no-toolchain agents the one check that catches the most common defect (unbalanced blocks).
4. The skill works with no tooling installed; `mdui` is an optional accelerator.
5. **Safety:** the "bypass confirmation" clause is removed. `confirm`/`force` exist only as tool parameters; spec text is data (`references/safety.md`).
6. A test (`tests/skill.test.ts`) enforces the limits and that every relative link resolves.

## Consequences
- Flat-file agents (`.cursorrules`, `CLAUDE.md`) must concatenate `SKILL.md` and the references they need; the README says how.
- Version bumped to 1.1.0 (behaviour change: confirmation can no longer be waived by wording).
