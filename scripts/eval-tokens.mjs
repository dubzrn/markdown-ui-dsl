#!/usr/bin/env node
// T-095 token benchmark. Counts tokens of the same UI scenarios in mdui, A2UI v1.0 JSON, json-render JSON (both produced by
// @vrillabs/mdui-export), and the upstream OpenUI Lang / YAML / Vercel JSON-Render / Thesys C1 samples. Writes evals/TOKENS.md and
// evals/tokens/results.json.
//   node scripts/eval-tokens.mjs [--check]     (--check re-runs and fails if the committed results differ: determinism)
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { encode as o200k } from "gpt-tokenizer/encoding/o200k_base";
import { encode as cl100k } from "gpt-tokenizer/encoding/cl100k_base";
import { countTokens as legacyClaude } from "@anthropic-ai/tokenizer";
import { parse } from "../packages/core/dist/index.js";
import { exportA2ui, exportJsonRender } from "../packages/export/dist/index.js";

const check = process.argv.includes("--check");
const here = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, here), "utf8");

const TOKENIZERS = {
  o200k_base: (s) => o200k(s).length,
  cl100k_base: (s) => cl100k(s).length,
  "claude-legacy": (s) => legacyClaude(s),
};
const count = (s) => Object.fromEntries(Object.entries(TOKENIZERS).map(([k, f]) => [k, f(s)]));

// Upstream totals published in reference/dsl/openui/benchmarks/README.md (tiktoken, gpt-5 encoder). Our o200k counts of
// the same files are compared against them to validate the counting.
const UPSTREAM_TOTALS = { oui: 4800, yaml: 9122, vercel: 10180, c1: 9948 };

const OPENUI = [
  "simple-table",
  "chart-with-data",
  "contact-form",
  "dashboard",
  "pricing-page",
  "settings-panel",
  "e-commerce-product",
];
const rows = [];
for (const name of OPENUI) {
  const src = read(`evals/tokens/mdui/${name}.ui.md`);
  const doc = parse(src);
  const a2 = exportA2ui(doc);
  const jr = exportJsonRender(doc);
  rows.push({
    scenario: name,
    group: "openui",
    formats: {
      mdui: count(src),
      "a2ui-json": count(JSON.stringify(a2.messages)),
      "json-render": count(JSON.stringify({ spec: jr.spec, catalog: jr.catalog })),
      "openui-lang": count(read(`evals/tokens/openui/${name}.oui`)),
      yaml: count(read(`evals/tokens/openui/${name}.yaml`)),
      "vercel-jsonl": count(read(`evals/tokens/openui/${name}.vercel.jsonl`)),
      "thesys-c1": count(read(`evals/tokens/openui/${name}.c1.json`)),
    },
    exportWarnings: { a2ui: a2.warnings.length, jsonRender: jr.warnings.length },
  });
}
const exDir = new URL("examples/", here);
for (const f of readdirSync(exDir)
  .filter((x) => x.endsWith(".ui.md"))
  .sort()) {
  const src = readFileSync(new URL(f, exDir), "utf8");
  const doc = parse(src);
  const a2 = exportA2ui(doc);
  const jr = exportJsonRender(doc);
  rows.push({
    scenario: f.replace(".ui.md", ""),
    group: "examples",
    formats: {
      mdui: count(src),
      "a2ui-json": count(JSON.stringify(a2.messages)),
      "json-render": count(JSON.stringify({ spec: jr.spec, catalog: jr.catalog })),
    },
    exportWarnings: { a2ui: a2.warnings.length, jsonRender: jr.warnings.length },
  });
}

const sum = (group, fmt, tk) =>
  rows.filter((r) => r.group === group).reduce((n, r) => n + (r.formats[fmt]?.[tk] ?? 0), 0);
const upstreamCheck = Object.fromEntries(
  Object.entries({ oui: "openui-lang", yaml: "yaml", vercel: "vercel-jsonl", c1: "thesys-c1" }).map(
    ([k, f]) => [k, { ours: sum("openui", f, "o200k_base"), upstream: UPSTREAM_TOTALS[k] }],
  ),
);
const results = { tokenizers: Object.keys(TOKENIZERS), rows, upstreamCheck };
const json = JSON.stringify(results, null, 2) + "\n";

const pct = (a, b) => `${a <= b ? "" : "+"}${(((a - b) / b) * 100).toFixed(1)}%`;
const cols = [
  "mdui",
  "openui-lang",
  "yaml",
  "vercel-jsonl",
  "thesys-c1",
  "a2ui-json",
  "json-render",
];
const table = (group, tk) => {
  const rs = rows.filter((r) => r.group === group);
  const cs = cols.filter((c) => rs.some((r) => r.formats[c]));
  const head = `| Scenario | ${cs.join(" | ")} |${group === "openui" ? " mdui vs OpenUI Lang |" : ""}`;
  const sep = `|---|${cs.map(() => "--:").join("|")}|${group === "openui" ? "--:|" : ""}`;
  const body = rs.map(
    (r) =>
      `| ${r.scenario} | ${cs.map((c) => r.formats[c]?.[tk] ?? "").join(" | ")} |${group === "openui" ? ` ${pct(r.formats.mdui[tk], r.formats["openui-lang"][tk])} |` : ""}`,
  );
  const tot = `| **TOTAL** | ${cs.map((c) => `**${sum(group, c, tk)}**`).join(" | ")} |${group === "openui" ? ` **${pct(sum(group, "mdui", tk), sum(group, "openui-lang", tk))}** |` : ""}`;
  return [head, sep, ...body, tot].join("\n");
};
const losses = rows
  .filter((r) => r.group === "openui")
  .flatMap((r) =>
    Object.keys(TOKENIZERS)
      .filter((tk) => r.formats.mdui[tk] > r.formats["openui-lang"][tk])
      .map((tk) => `${r.scenario} (${tk})`),
  );
const smallestEverywhere = rows
  .filter((r) => r.group === "openui")
  .every((r) =>
    Object.keys(TOKENIZERS).every((tk) =>
      Object.entries(r.formats).every(([f, c]) => f === "mdui" || r.formats.mdui[tk] < c[tk]),
    ),
  );
const md = `# Token benchmark (T-095)

Generated by \`node scripts/eval-tokens.mjs\`; raw counts in \`evals/tokens/results.json\`. Re-running reproduces them exactly (\`--check\`, run in CI).

## What is measured

The same 7 UI scenarios as OpenUI's benchmark (\`reference/dsl/openui/benchmarks\`, MIT, samples vendored in \`evals/tokens/openui/\`), plus the 7 project examples.

| Format | Where the text comes from |
|---|---|
| \`mdui\` | **hand-written by this project** for the 7 OpenUI scenarios (\`evals/tokens/mdui/\`): every literal string, number, table row, option and chart series is carried over; the project examples are the examples as shipped |
| \`openui-lang\`, \`yaml\`, \`vercel-jsonl\`, \`thesys-c1\` | upstream samples, unmodified (generated by gpt-5.2 from OpenUI Lang, then projected into the other three) |
| \`a2ui-json\` | \`mdui export --to a2ui\` of the mdui file, minified JSON of the message list |
| \`json-render\` | \`mdui export --to json-render\` of the mdui file, minified JSON of spec + catalog |

Tokenizers: \`o200k_base\` and \`cl100k_base\` (gpt-tokenizer 4.x) and \`claude-legacy\` (\`@anthropic-ai/tokenizer\`, the Claude 1/2-era tokenizer: **not** the tokenizer of current Claude models, so treat it as a second, different BPE family rather than a Claude measurement).

## Validation of the counting

Our \`o200k_base\` totals for the upstream files against the totals in OpenUI's README (tiktoken, gpt-5 encoder):

| Format | ours | upstream README |
|---|--:|--:|
${Object.entries(upstreamCheck)
  .map(([k, v]) => `| ${k} | ${v.ours} | ${v.upstream} |`)
  .join("\n")}

\`oui\` and \`vercel\` reproduce upstream exactly; \`yaml\` is off by ${Math.abs(upstreamCheck.yaml.ours - upstreamCheck.yaml.upstream)} tokens and \`c1\` by ${Math.abs(upstreamCheck.c1.ours - upstreamCheck.c1.upstream)}. The cause for those two is not established (likely whitespace or serialisation differences in how upstream counted them); they do not affect the mdui comparison, which is against OpenUI Lang.

## o200k_base: OpenUI scenarios
${table("openui", "o200k_base")}

Scenarios where mdui is **larger** than OpenUI Lang, under any of the three tokenizers: ${losses.length === 0 ? "none" : losses.join(", ")}.

## cl100k_base: OpenUI scenarios
${table("openui", "cl100k_base")}

## claude-legacy: OpenUI scenarios
${table("openui", "claude-legacy")}

## o200k_base: project examples (no OpenUI equivalent exists)
${table("examples", "o200k_base")}

## Reading these numbers

* **The a2ui-json and json-render columns are lossy.** They are the exporters' output, which degrades constructs the target has no component for (charts, accordions, tabs, …). The exporter warning counts per scenario are in \`results.json\` (\`exportWarnings\`). A faithful A2UI encoding would be larger.
* **mdui versus OpenUI Lang is not like for like.** mdui is a wireframe: it carries no chart rendering parameters (axis titles, curve type), no validation rules beyond \`required\`/\`maxlength\`/\`type\`, and no image URLs, while OpenUI Lang specifies those. Chart data is carried in frontmatter \`data:\`. Where content could not be carried over it was dropped, not approximated.
* The mdui files were written by the same project that proposes mdui. An independent author could write them shorter or longer; the pass in the plan is for a reviewer to re-count three scenarios.
* A2UI Express was **not measured**: its compiler is Kotlin-only in the pinned upstream and writing Express by hand would be an unverified guess.
* One model, one run: the upstream samples are from a single gpt-5.2 generation; mdui's are mine. Token counts are not a measure of generation quality or cost with any particular model.

## Decision on a compact profile

None proposed. On these seven scenarios mdui is ${smallestEverywhere ? "already smaller than every compared format, in every scenario, under all three tokenizers" : "not the smallest format everywhere (see the tables above)"}, and the comparison is not like for like (see above), so this benchmark gives no data supporting a more compact syntax at the cost of readability. Principle P1 (human readability is not traded away) stands; any compact profile would need an RFC.
`;
if (check) {
  const old = readFileSync(new URL("evals/tokens/results.json", here), "utf8");
  if (old !== json) {
    console.error(
      "evals/tokens/results.json differs from a fresh run (counts are not reproducible or inputs changed)",
    );
    process.exit(1);
  }
  console.log(
    `token counts reproduce (${rows.length} scenarios, ${results.tokenizers.length} tokenizers)`,
  );
} else {
  writeFileSync(new URL("evals/tokens/results.json", here), json);
  writeFileSync(new URL("evals/TOKENS.md", here), md);
  console.log(md.split("\n").slice(20, 60).join("\n"));
}
