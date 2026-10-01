# ADR-004 — Frontmatter: bundled strict YAML subset

Status: Accepted · Date: 2026-10-01 · Implements: T-002

## Decision

`core` ships a small **strict YAML-subset** parser for frontmatter (scalars, lists, one-level-deep maps, quoted strings,
no anchors/aliases/tags/merge keys, no multi-document). Anything outside the subset is a diagnostic, not a silent parse.
Full YAML (`yaml` package) is permitted only in `@mdui/tools` and `@mdui/tokens` (design-token files).

## Why

Zero-dependency core (ADR-003); removes YAML's code-execution-adjacent features (tags, anchors/billion-laughs) from the
untrusted-input path (agents emit this text); deterministic diagnostics with line/column.
