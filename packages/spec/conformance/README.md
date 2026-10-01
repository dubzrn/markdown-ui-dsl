# Conformance corpus

Language-neutral fixtures any implementation of the Markdown UI DSL can run. Files: `v1/valid.json` (must parse with **no**
diagnostics), `v1/invalid.json` (must produce exactly the listed diagnostics), validated by `fixture.schema.json`.

## Fixture

```json
{ "id": "nest-siblings", "input": "…document text…", "since": "1.0",
  "expect": { "outline": "column(card(line),card(line))", "diagnostics": [{ "code": "E1001", "line": 1 }] } }
```

## Runner protocol

1. Parse `input` (UTF-8, `\n` or `\r\n` line endings).
2. Collect diagnostics as `(code, 1-based start line)` pairs, **sorted by source position** (ties keep emission order).
3. Assert the list equals `expect.diagnostics` exactly (order, count, codes, lines).
4. If `expect.outline` is present, assert the document outline equals it.
5. A parser must never crash or hang on any fixture.

## Outline

A comma-separated sequence of top-level nodes; `frontmatter` first when present. Containers and lists print their children in
parentheses (`card()` when empty). Node names: containers `column row card modal header footer bubble-user bubble-agent`;
leaves `line heading hint directive comment divider code tabs table`; lists `list(item,…)` where an item with nested blocks
prints `item(block,…)`. Blank lines produce no node. Decisions behind the corpus: `docs/adr/ADR-005-v1-ambiguity-decisions.md`.
