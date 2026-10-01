# @mdui/cli

```
mdui validate <files|dirs|globs…>   parse + analyse
mdui lint     <files|dirs|globs…>   validate + rule catalogue
mdui ast      <file>                JSON AST (indented; --compact for one line)
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
