# MCP server (`@mdui/mcp`)

`mdui-mcp` exposes the toolkit to any MCP client over **stdio** (newline-delimited JSON-RPC 2.0). It is a small, dependency-free implementation of `initialize`, `ping`, `tools/list` and `tools/call` (protocol versions `2025-06-18`, `2025-03-26`, `2024-11-05`).

```jsonc
// Claude Code / Cursor / any client with an mcpServers block (the package is not published yet: point at your checkout)
{ "mcpServers": { "mdui": { "command": "node", "args": ["/path/to/markdown-ui-dsl/packages/mcp/dist/bin.js"] } } }
```

## Tools

Every tool has a JSON-Schema `inputSchema` (unknown properties rejected), an `outputSchema`, and returns `structuredContent` plus the same JSON as text. All are annotated read-only.

| Tool | Input | Output |
|---|---|---|
| `mdui_parse` | `source` | `dsl`, `diagnostics`, `ast` |
| `mdui_validate` | `source` | `ok`, `errors`, `warnings`, `diagnostics` |
| `mdui_lint` | `source`, `catalog?` | same, plus `catalogIssues` |
| `mdui_fix` | `source`, `catalog?` | `text`, `applied`, `rejected` (each fix kept only if the document strictly improves) |
| `mdui_format` | `source` | `text`, `changed` |
| `mdui_diff` | `before`, `after` | `ops`, `summary`, `regressions` |
| `mdui_render` | `source`, `style?`, `state?`, `theme?`, `fragment?` | `html` |
| `mdui_prompt` | `documents?`, `agent?`, `all?`, `catalog?`, `design?`, `map?` | `prompt` |
| `mdui_grammar` | `format`, `dsl?`, `catalog?`, `max_depth?`, `tokens?`, `data?` | `text` |
| `mdui_coverage` | `requirements`, `specs` | `covered`, `uncovered`, `unknown`, `totals` |
| `mdui_catalog` | `catalog?` | `components`, `allow`, `closed`, `issues` |
| `mdui_rules` | none | `rules` |

## Safety model

- **Text in, text out.** Arguments carry document text (each at most 1,000,000 characters); the server reads and writes no files, so `[[ USE: … ]]` includes cannot be resolved and a path in a spec can never be opened.
- **No tool changes anything.** There is deliberately no sync/apply/write tool. When one arrives (T-081) it will exist only with a mandatory `confirm` parameter that the *user's session* supplies; spec text can never grant it.
- **Spec text is data.** Instruction-like text, bad URL schemes and the like are *reported* (`W7001`, `E7002`) and never acted on; the server's `instructions` say the same to the model.
- Bad arguments are tool errors (`isError: true`), unknown tools are protocol errors (`-32602`), malformed JSON is `-32700`; nothing throws. A line over 8 MB is refused unparsed.

## Verification

- Protocol and tool tests: `packages/mcp/test/server.test.ts` (including a real stdio child process and hostile-input cases).
- **Two independent official clients**, run against the built server, both validating `structuredContent` against each tool's `outputSchema`:
  - TypeScript SDK `@modelcontextprotocol/sdk` 1.31.0: `MCP_SDK_DIR=<dir with the sdk installed> node scripts/mcp-client-js.mjs`: PASS (initialize, 12 tools, every tool called, bad arguments are tool errors).
  - Python SDK `mcp` 2.2.0: `python3 scripts/mcp-client-py.py`: PASS (same checks).
  Both run in the nightly workflow. Results above are from this revision; no other client (Claude Desktop, Cursor, VS Code) has been run by hand.

## Limits

Resources, prompts, sampling and `notifications/tools/list_changed` are not implemented (the server advertises only `tools`). stdio only; there is no HTTP transport.
