// SP-4 token-cost measurement. Setup: `npm i --prefix .tools/bench gpt-tokenizer` (not a repo dependency).
// Usage: node bench/sp4/measure.mjs
import { createRequire } from "node:module";
import fs from "node:fs";

const require = createRequire(new URL("../../.tools/bench/", import.meta.url));
const { encode: o200k } = require("gpt-tokenizer/encoding/o200k_base");
const { encode: cl100k } = require("gpt-tokenizer/encoding/cl100k_base");

const A2UI = "reference/protocols/a2ui/catalogs/basic/v1/examples/";
const rows = [];
for (const name of ["00_simple-login-form", "05_product-card", "07_task-card", "08_user-profile"]) {
  const a2ui = JSON.parse(fs.readFileSync(`${A2UI}${name}.json`, "utf8"));
  const mdui = fs.readFileSync(`bench/sp4/${name}.ui.md`, "utf8");
  // A2UI payloads as an agent would emit them: all messages, minified JSON.
  const mini = JSON.stringify(a2ui.messages);
  const pretty = JSON.stringify(a2ui.messages, null, 2);
  // Most generous to A2UI: only the component list (no createSurface/updateDataModel envelopes, no data values).
  const comps = JSON.stringify(a2ui.messages.flatMap((m) => m.updateComponents?.components ?? []));
  const count = (s) => [o200k(s).length, cl100k(s).length];
  rows.push({
    name,
    comps: count(comps),
    mdui: count(mdui),
    mini: count(mini),
    pretty: count(pretty),
    chars: [mdui.length, mini.length],
  });
}
const pct = (a, b) => `${(((a - b) / b) * 100).toFixed(1)}%`;
console.log("\ncomponents-only (most generous to A2UI), o200k:");
for (const r of rows)
  console.log(
    `- ${r.name}: mdui ${r.mdui[0]} vs A2UI components ${r.comps[0]} (${pct(r.mdui[0], r.comps[0])})`,
  );
console.log(
  "\n| scenario | mdui (o200k) | A2UI min (o200k) | A2UI pretty (o200k) | Δ vs min | mdui (cl100k) | A2UI min (cl100k) | Δ vs min |",
);
console.log("|---|---|---|---|---|---|---|---|");
let sm = [0, 0],
  su = [0, 0];
for (const r of rows) {
  sm[0] += r.mdui[0];
  sm[1] += r.mdui[1];
  su[0] += r.mini[0];
  su[1] += r.mini[1];
  console.log(
    `| ${r.name} | ${r.mdui[0]} | ${r.mini[0]} | ${r.pretty[0]} | ${pct(r.mdui[0], r.mini[0])} | ${r.mdui[1]} | ${r.mini[1]} | ${pct(r.mdui[1], r.mini[1])} |`,
  );
}
console.log(
  `| **total** | ${sm[0]} | ${su[0]} | | ${pct(sm[0], su[0])} | ${sm[1]} | ${su[1]} | ${pct(sm[1], su[1])} |`,
);
