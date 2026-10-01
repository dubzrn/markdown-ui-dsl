#!/usr/bin/env node
// MCP client check #1 (T-062): the official TypeScript SDK client against the stdio server.
//   MCP_SDK_DIR=/path/with/node_modules node scripts/mcp-client-js.mjs     (npm i @modelcontextprotocol/sdk there)
// The SDK client validates every `structuredContent` against the tool's declared outputSchema, so a pass checks both.
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = process.env.MCP_SDK_DIR;
if (!dir) {
  console.log(
    "mcp-client-js SKIPPED: set MCP_SDK_DIR to a directory where `npm i @modelcontextprotocol/sdk` was run",
  );
  process.exit(0);
}
const root = join(dir, "node_modules/@modelcontextprotocol/sdk");
const req = createRequire(join(root, "package.json"));
const { Client } = await import(pathToFileURL(join(root, "dist/esm/client/index.js")).href);
const { StdioClientTransport } = await import(
  pathToFileURL(join(root, "dist/esm/client/stdio.js")).href
);
const version = req("./package.json").version;

const bin = join(dirname(fileURLToPath(import.meta.url)), "../packages/mcp/dist/bin.js");
const client = new Client({ name: "mdui-check-js", version: "1.0.0" });
await client.connect(new StdioClientTransport({ command: "node", args: [bin] }));
let failed = 0;
const check = (name, cond, detail = "") => {
  console.log(`${cond ? "ok  " : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
  if (!cond) failed++;
};

const info = client.getServerVersion();
check("initialize", info?.name === "mdui", `server ${info?.name} ${info?.version}, sdk ${version}`);
const { tools } = await client.listTools();
check(
  "tools/list",
  tools.length >= 12 && tools.every((t) => t.outputSchema && t.inputSchema),
  `${tools.length} tools`,
);
check("no write/sync tool", !tools.some((t) => /sync|apply|write/.test(t.name)));

const v = await client.callTool({
  name: "mdui_validate",
  arguments: { source: "::: CARD :::\nx\n" },
});
check(
  "validate (structured output checked against schema)",
  v.isError !== true && v.structuredContent?.ok === false && v.structuredContent?.errors === 1,
);
const l = await client.callTool({
  name: "mdui_lint",
  arguments: { source: "[Go](javascript:alert(1))\n" },
});
check(
  "lint finds E7002",
  l.structuredContent?.diagnostics?.some((d) => d.code === "E7002"),
);
const f = await client.callTool({ name: "mdui_fix", arguments: { source: "::: CARD :::\nx\n" } });
check("fix", f.structuredContent?.text.includes("--- END ---"));
const bad = await client.callTool({ name: "mdui_validate", arguments: { source: 5 } });
check("bad arguments -> tool error", bad.isError === true);
for (const t of tools) {
  const args =
    t.name === "mdui_diff"
      ? { before: "a\n", after: "b\n" }
      : t.name === "mdui_grammar"
        ? { format: "lark" }
        : t.name === "mdui_coverage"
          ? { requirements: "FR-1", specs: [] }
          : t.name === "mdui_catalog" || t.name === "mdui_rules" || t.name === "mdui_prompt"
            ? {}
            : { source: "# Hi\n" };
  let ok = false;
  try {
    const r = await client.callTool({ name: t.name, arguments: args });
    ok = r.isError !== true && r.structuredContent !== undefined;
  } catch (e) {
    console.log("  ", t.name, String(e).slice(0, 200));
  }
  check(`call ${t.name}`, ok);
}
await client.close();
console.log(failed === 0 ? "mcp-client-js PASS" : `mcp-client-js FAILED (${failed})`);
process.exit(failed === 0 ? 0 : 1);
