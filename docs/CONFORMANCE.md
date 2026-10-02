# Claiming conformance

Any implementation of the Markdown UI DSL (a parser in Rust, Python, Go, ...) can test itself against the language-neutral **conformance bundle** shipped in `@vrillabs/mdui-spec` (`conformance/`): **494 fixtures** in four suites, versioned with the package and the grammars (`manifest.json` lists every file with its fixture count and SHA-256).

| Suite | What your implementation must produce | Fixtures |
|---|---|---|
| `block` | diagnostics `(code, line)` and the outline of the document | 222 |
| `inline` | the inline node list (and, for 2.0, the issue codes) | 129 |
| `frontmatter` | the parsed data and the issues `(code, line)` | 57 |
| `semantic` | diagnostics after analysis (`file`/`files` give a sandbox for `[[ USE ]]` includes and data files) | 86 |

Fixtures from `v1/` must also pass in 2.0 mode only where the file says so; `since` marks the version that introduced each one.

## Run it
1. Write an adapter: a command that reads one JSON request on stdin and prints one JSON answer on stdout. The request/answer shapes are in the header of `conformance/runners/run.py`; the reference adapter is `scripts/conformance-harness.mjs` (25 lines).
2. `python3 conformance/runners/run.py -- <your command>` (add `--suite inline` to run one suite).
3. Exit 0 and `N/N passed` means every fixture passed. A crash, a hang (30 s) or malformed JSON fails that fixture, never the run.

## What you may claim
- **"Passes the Markdown UI DSL conformance bundle X.Y.Z"**, with the number printed by the runner. Say which suites if it is not all four.
- The bundle is a regression and interoperability check, not a proof of equivalence: it fixes behaviour on 494 inputs, and the grammar (`@vrillabs/mdui-spec/grammar`) and the decision record (`docs/adr/ADR-005-v1-ambiguity-decisions.md`) remain the normative text where the fixtures are silent.
- Diagnostic *messages* are not compared, only codes and lines.

## What is tested here
The TypeScript reference implementation passes all 494 (`pnpm conformance`, in CI). The runner is written in Python and drives the TypeScript implementation through the adapter, so the *runner* is a second language; there is no independent second **implementation** of the DSL yet, so cross-implementation agreement has not been demonstrated. A test (`tests/conformance-bundle.test.ts`) proves the runner fails a wrong or crashing implementation.
