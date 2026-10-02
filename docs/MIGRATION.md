# Migrating from DSL 1.x to 2.0

DSL 1.x documents stay valid and are read as 1.x unless the frontmatter says `dsl: 2.0`. Migration is opt-in, per file.

## What changes meaning when you add `dsl: 2.0`

Only text that was plain text in 1.x and is syntax in 2.0 (RFC-0001 §6):

| In a 1.x file | In 2.0 |
|---|---|
| a line `--- END X ---` | a typed closer; it must match the innermost open block (`E1004`) |
| `{: … }` after a component | an attribute list |
| `{{ path }}` in text | a data binding |
| `[ KIND: … ]` with an upper-case kind | a primitive (an unknown one is `E1302` unless a catalog defines it) |
| `*** Title ***`, `> @dark`, … | labelled divider, environment directive |

Escapes behave as before, so `\{\{ x \}\}` is a literal.

## The tool

```bash
mdui migrate docs/*.ui.md            # dry run: lists what would change and every spot that needs a human
mdui migrate docs/*.ui.md --write    # writes files that have nothing to review
mdui migrate docs/*.ui.md --write --force   # writes even when manual-review items remain
```

Example output for a file that uses a literal `{{ x }}` and a stray typed-closer line:

```
m1.ui.md:1 bump: (add) → ---⏎dsl: 2.0⏎---
m1.ui.md:2 MANUAL: `{{ … }}` is a data binding in 2.0 (use `\{\{` for literal braces)
m1.ui.md:3 MANUAL: line looks like a typed closer (`--- END KIND ---`): plain text in 1.x, a closer in 2.0
m1.ui.md: NOT migrated (manual review needed)
```

Exit code is 1 while any file still needs a manual decision. After migrating, run `mdui lint` and, if you have agents reading the files, re-sync the skill.

## Package names

The packages were renamed from the internal `@mdui/*` to **`@vrillabs/mdui-*`** (`@mdui/core` is now `@vrillabs/mdui-core`, and so on) before the first publish. The `mdui` and `mdui-mcp` binaries are unchanged.

## Not covered

There is no automated check that a migrated file *means* the same thing to a downstream renderer you wrote yourself; the conformance suite (`docs/CONFORMANCE.md`) is the way to test an implementation.
