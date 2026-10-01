# ADR-001 — Parser strategy

Status: Accepted · Date: 2026-10-01 · Implements: T-002 · Refs: SPEC §4

## Decision

`@mdui/core` uses a **hand-written, line-oriented parser** with a normative EBNF in `@mdui/spec`.
A Lark grammar is **generated** from the EBNF and parity-tested against the parser (T-0xx grammar pack);
the parser remains the reference implementation.

## Why

- The DSL is delimiter-line based (`||| X |||`, `=== X ===`, `::: X :::`, `--- END ---`); a line scanner plus a
  container stack gives precise diagnostics and error recovery (always returns an AST + diagnostics).
- Zero runtime dependencies and no Node APIs (ADR-003) rule out parser-generator runtimes.
- Generated grammars (Lark/GBNF) serve constrained decoding; they cannot replace the parser's recovery.

## Rejected

Parser-generator runtime (peggy/chevrotain/tree-sitter in core): extra dependency, weaker recovery, harder streaming.
Markdown-AST plugins (remark/Markdoc): the DSL is not CommonMark-compatible at block level.
