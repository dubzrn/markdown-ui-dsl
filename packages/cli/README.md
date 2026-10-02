# @vrillabs/mdui-cli

```
mdui validate <files|dirs|globs…>   parse + analyse
mdui lint     <files|dirs|globs…>   validate + rule catalogue
mdui ast      <file>                JSON AST (indented; --compact for one line)
mdui fmt      [--check] <files…>    canonical formatting (rewrites; --check only reports, exit 1 if changes)
mdui render   <file> [--style sketch|clean|wireframe|none] [--state s] [--theme auto|light|dark] [--out f]
mdui diff     <before> <after>      semantic diff; exit 1 on regressions (--json)
mdui migrate  [--write] [--force] <files…>   v1 → 2.0; dry run by default
mdui rules    [--json]              the lint rule catalogue
mdui lint --fix                     apply verified fixes in place
```

Options: `--json` · `--fail-on error|warn|info|none` (default `error`) · `--config <path>` (default `./mdui.config.json`) · `-h` · `-v`.

**Exit codes:** `0` ok · `1` diagnostics at or above `--fail-on` · `2` usage or config error · `3` internal error.

**Config** (`mdui.config.json`, unknown keys are an error): `{ "failOn": "error", "root": ".", "rules": { "empty-container": "error", "duplicate-id": "off" } }`.
`root` is the project root used to resolve `[[ USE: … ]]` includes and `data:` files (never outside it).

## `--json` output (version 1)

```json
{ "tool": "mdui", "version": 1, "command": "validate",
  "files": [ { "file": "a.ui.md", "diagnostics": [
    { "code": "E1001", "severity": "error", "message": "…", "rule": "balanced-blocks",
      "line": 1, "col": 1, "endLine": 1, "endCol": 13 } ] } ],
  "summary": { "files": 1, "errors": 1, "warnings": 0, "infos": 0 } }
```

`rule` is present for `lint`. `ast` prints the `Document` JSON described by `packages/spec/schema/ast.schema.json`.

## `diff --json`

```json
{ "tool": "mdui", "version": 1, "command": "diff", "before": "a.ui.md", "after": "b.ui.md",
  "ops": [ { "op": "added|removed|changed|moved", "path": "card › ", "desc": "button \"Go\"", "line": 2 } ],
  "summary": { "added": 1, "removed": 0, "changed": 0, "moved": 0 },
  "regressions": [ "accessibility rule newly failing: link-text (0 → 1)" ] }
```

`changed` ops add `before`/`after`; `moved` ops add `from`. Regressions: a removed `required` element, or a W3xxx accessibility rule that newly fails.

## `prompt`

`mdui prompt [--agent generic|claude|cursor|copilot|codex|gemini] [--catalog c.yaml] [--map m.yaml] [--design DESIGN.md] [--all] [--out file] [specs…]`

Composes the context an agent needs: a language reference limited to the constructs your specs use (a project without charts never mentions `CHART`; `--all` includes everything), project components from the catalog, design tokens, bound data paths, the component map, a few examples and the trust rules. Output is deterministic: same inputs, same bytes, regardless of file order. `--agent` changes only the wrapper (XML sections for `claude`, an `.mdc` header for `cursor`).

## `coverage`

`mdui coverage --requirements <file> [--json] <specs…>`: which requirements do the `.ui.md` specs cover (frontmatter `requirements:`)? Understands Spec Kit ids (`FR-001`), OpenSpec names (`### Requirement: Name`) and Kiro numbers (`### Requirement N:`; a reference `N.k` covers `N`). Exit 1 when a requirement is uncovered or a spec references one that does not exist. See [`docs/SDD_INTEROP.md`](../../docs/SDD_INTEROP.md).

## `grammar`

`mdui grammar --format lark|gbnf|json-schema [--dsl 1|2.0] [--catalog c.yaml] [--max-depth N] [--tokens a,b] [--data x.y,z] [--out file]`: emits a generation grammar for constrained decoding. Containers nest recursively, so an opener without its closer (or, in 2.0, a mismatched typed closer) cannot be generated. In 2.0 the grammar is closed-world: `[ UPPER: … ]` only for catalog widgets, `::: NAME … :::` only for catalog containers, with prop shapes from the catalog. `--tokens` restricts directive names, `--data` restricts `{{ binding }}` paths, `--max-depth` bounds nesting. Details, limits and the engine matrix: [`docs/GRAMMAR.md`](../../docs/GRAMMAR.md).
