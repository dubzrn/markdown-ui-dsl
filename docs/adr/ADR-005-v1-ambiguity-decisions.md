# ADR-005 — DSL 1.0.x ambiguity and escaping decisions (T-011, LNG-09)

Status: Accepted · Date: 2026-10-01 · Resolves A-01…A-12 in `packages/spec/grammar/v1.md`.
Every decision has ≥ 2 positive and ≥ 2 negative fixtures in `packages/spec/conformance/v1/` (ids `D<n>-…`).

| # | Decision |
| --- | --- |
| D1 | **Button vs link.** `[ Text ](x)` — a space after `[` or before `]` — is a *button*. `[Text](x)` with no padding is a *link*. Both carry the target. |
| D2 | **Bare `[ Text ]`** is a button without an action. Typed prefixes win and are case-sensitive: `text:`, `IMG:` (and, in 2.0, `SLIDER:` …). `[ Text: x ]` (wrong case) is a button labelled `Text: x`. |
| D3 | **`---`.** Only the first line of the file may be a frontmatter fence; `--- END ---` (exact, surrounding whitespace allowed) is the only closer; any other `---` line outside a table is plain text and never a divider. |
| D4 | **Tabs vs table.** A line that starts with `|[` (adjacent) and ends with `|` is a tabs line. Otherwise a table needs a header row followed by a separator row. |
| D5 | **Checkbox.** `[ ]`, `[x]`, `[X]` immediately followed by a space and a label ⇒ checkbox. `[ x ]` (padded) is a button. Radio `( )`/`(x)` likewise; toggles `[on]`/`[off]`. |
| D6 | **Bullets.** `- ` and `* ` (marker + space) at the start of a line (after indent) are list items; `***` alone is a divider; `**bold**` is emphasis. |
| D7 | **Escapes.** A backslash escapes the next character when it is one of `\ [ ] ( ) { } | > # * _ \``; the escaped character is literal text. Elsewhere a backslash is literal. |
| D8 | **Literal contexts.** Fenced code and inline code spans are literal: no widget, escape or comment processing inside. A fenced block never closes a container. |
| D9 | **Comments.** `<!--` at block start opens a comment that runs to `-->` (maybe several lines). Unterminated ⇒ `E1003`, rest of file is the comment. |
| D10 | **Missing/extra closers.** Unclosed container ⇒ `E1001` at its opener, auto-closed at end of file. A `--- END ---` with nothing open ⇒ `E1002`, ignored. The parser always returns a tree. |
| D11 | **Hints.** A `>` line is a hint. `> @sm|md|lg|xl a: b, c: d` is a responsive directive. An unknown `@token` ⇒ hint + `W1201`; a known breakpoint with malformed pairs ⇒ hint + `W1203`. |
| D12 | **Line model.** Every non-blank line that is not another block is one `line` node (the DSL is line-oriented, unlike CommonMark paragraphs). |

## Addendum (T-016) — emphasis

- **D13.** Emphasis never nests: inside `**…**` or `*…*`, further `*`/`_` stay literal. Found by the print-stability property test (`***` is ambiguous). Underscore emphasis only applies at word boundaries (`snake_case` is text).
- **D14.** Code spans bind tighter than every other delimiter: closers inside `` `…` `` are not seen.
- **D15.** A comma cannot be escaped inside dropdown options in 1.x (comma is not in the D7 escape set).
