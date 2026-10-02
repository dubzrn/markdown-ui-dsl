# Using `.ui.md` with spec-driven workflows

A `.ui.md` file joins an SDD flow through one frontmatter key, `requirements:`, listing the requirement identifiers the screen implements. `mdui coverage` then reports which requirements no screen covers and which references point at nothing.

```bash
mdui coverage --requirements <requirements doc> <screens…>   # exit 1 if anything is uncovered or unknown
```

The identifier style follows the tool's own requirements document. Runnable samples live in [`examples/sdd/`](../examples/sdd/) (each lints clean and is covered by `packages/tools/test/coverage.test.ts`).

| Flow | Requirements document | Identifier | Sample |
|---|---|---|---|
| [Spec Kit](https://github.com/github/spec-kit) | `specs/<n>-<feature>/spec.md`, bullets `**FR-001**: …` | `FR-001` | `examples/sdd/spec-kit` |
| [OpenSpec](https://github.com/Fission-AI/OpenSpec) | `openspec/specs/<capability>/spec.md`, headings `### Requirement: <Name>` | the name | `examples/sdd/openspec` |
| Kiro (EARS) | `.kiro/specs/<feature>/requirements.md`, headings `### Requirement N: …`, criteria `N.k` | `N`, or `N.k` for one criterion (covers `N`) | `examples/sdd/kiro` |

Formats were taken from the pinned copies in `reference/sdd/`. OpenSpec has no numeric ids, so its requirement *names* are the identifiers: renaming a requirement there makes the reference `unknown` until the screen is updated, which is the point.

## Walkthrough (Spec Kit)

1. Write `spec.md` with `FR-001…`.
2. Draw the screen in `login.ui.md` and add `requirements: [FR-001, FR-002, FR-003]`.
3. `mdui lint login.ui.md` (rule `requirements-format` flags duplicates and empty entries, `W2801`).
4. `mdui coverage --requirements spec.md login.ui.md` in CI. Add a requirement and CI fails until a screen claims it.

Spec text is data: a requirement or a `requirements:` entry can never trigger commands or grant permissions.
