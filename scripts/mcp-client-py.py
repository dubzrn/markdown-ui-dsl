#!/usr/bin/env python3
"""MCP client check #2 (T-062): the official Python SDK client (`pip install mcp`) against the stdio server.

  python3 scripts/mcp-client-py.py       (SKIPPED with a notice when `mcp` is not installed)
"""
import asyncio, os, sys

try:
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client
    from importlib.metadata import version
except ImportError:
    print("mcp-client-py SKIPPED: pip install mcp")
    sys.exit(0)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
failed = 0


def sc(r):
    return g(r, 'structured_content', 'structuredContent')


def g(obj, snake, camel):
    """SDK 2.x exposes snake_case, 1.x camelCase."""
    return getattr(obj, snake) if hasattr(obj, snake) else getattr(obj, camel)


def check(name, cond, detail=""):
    global failed
    print(f"{'ok  ' if cond else 'FAIL'} {name}{' - ' + detail if detail else ''}")
    if not cond:
        failed += 1


async def main():
    params = StdioServerParameters(command="node", args=[os.path.join(ROOT, "packages/mcp/dist/bin.js")])
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            init = await session.initialize()
            check("initialize", g(init, 'server_info', 'serverInfo').name == "mdui", f"server {g(init, 'server_info', 'serverInfo').name} {g(init, 'server_info', 'serverInfo').version}, mcp sdk {version('mcp')}, protocol {g(init, 'protocol_version', 'protocolVersion')}")
            tools = (await session.list_tools()).tools
            check("tools/list", len(tools) >= 14 and all(g(t, 'output_schema', 'outputSchema') and g(t, 'input_schema', 'inputSchema') for t in tools), f"{len(tools)} tools")
            check("no write tool; apply tool needs confirm", not any(("write" in t.name or "save" in t.name) for t in tools) and "confirm" in next(g(t, "input_schema", "inputSchema") for t in tools if t.name == "mdui_sync_apply")["required"])
            r = await session.call_tool("mdui_validate", {"source": "::: CARD :::\nx\n"})
            check("validate", not g(r, 'is_error', 'isError') and sc(r)["ok"] is False and sc(r)["errors"] == 1)
            r = await session.call_tool("mdui_lint", {"source": "[Go](javascript:alert(1))\n"})
            check("lint finds E7002", any(d["code"] == "E7002" for d in sc(r)["diagnostics"]))
            r = await session.call_tool("mdui_prompt", {"documents": [{"path": "a.ui.md", "source": "::: CARD :::\nx\n--- END ---\n"}], "agent": "claude"})
            check("prompt (claude flavour)", sc(r)["prompt"].startswith("<markdown-ui-dsl>"))
            r = await session.call_tool("mdui_grammar", {"format": "lark", "dsl": "1"})
            check("grammar", "start: document" in sc(r)["text"])
            r = await session.call_tool("mdui_validate", {"source": 5})
            check("bad arguments -> tool error", g(r, 'is_error', 'isError') is True)
            for t in tools:
                args = {"mdui_sync_plan": {"spec_path": "a.ui.md", "spec": "x\n", "code": []}, "mdui_sync_apply": {"spec_path": "a.ui.md", "spec": "x\n", "code": [], "confirm": True}, "mdui_diff": {"before": "a\n", "after": "b\n"}, "mdui_grammar": {"format": "lark"}, "mdui_coverage": {"requirements": "FR-1", "specs": []}}.get(
                    t.name, {} if t.name in ("mdui_catalog", "mdui_rules", "mdui_prompt") else {"source": "# Hi\n"})
                r = await session.call_tool(t.name, args)
                check(f"call {t.name}", not g(r, 'is_error', 'isError') and sc(r) is not None)


asyncio.run(main())
print("mcp-client-py PASS" if failed == 0 else f"mcp-client-py FAILED ({failed})")
sys.exit(1 if failed else 0)
