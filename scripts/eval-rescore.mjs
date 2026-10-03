#!/usr/bin/env node
// Re-score the raw answers of an eval run (the --out JSON of scripts/eval-llm.mjs) without calling a model, and report what the
// headline table hides: results per task kind, how many answers are distinct (at temperature 0 seeds usually repeat), and the
// diagnostic codes behind nesting errors.
//   node scripts/eval-rescore.mjs run.json [--pick first|last]    (first = the scorer used when the baseline was run)
import { readFileSync } from "node:fs";
import { ALL_TASKS, scoreAnswer, wilson } from "../packages/evals/dist/index.js";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
if (file === undefined) {
  console.error("usage: node scripts/eval-rescore.mjs run.json [--pick first|last]");
  process.exit(2);
}
const pick = args.includes("--pick") ? args[args.indexOf("--pick") + 1] : "last";
const run = JSON.parse(readFileSync(file, "utf8"));
const tasks = new Map(ALL_TASKS.map((t) => [t.id, t]));
const pct = (k, n) => (n === 0 ? "n/a" : `${Math.round((100 * k) / n)}%`);
const ci = (k, n) => {
  const [lo, hi] = wilson(k, n);
  return `${Math.round(lo * 100)}-${Math.round(hi * 100)}%`;
};

const scored = run.results
  .filter((r) => r.error === undefined)
  .map((r) => ({
    ...r,
    s: scoreAnswer(tasks.get(r.taskId), r.answer, {
      pick,
      ...(run.catalog ? { catalog: run.catalog } : {}),
    }),
  }));
console.log(
  `${file}: ${run.models.join(", ")}; extraction: ${pick} fenced block; ${scored.length} answers\n`,
);

function table(title, rows) {
  console.log(
    `${title}\n\n| Arm | Kind | n | Pass (95% CI) | Parses cleanly | Nesting errors |\n|---|---|--:|---|--:|--:|`,
  );
  for (const arm of run.arms)
    for (const kind of ["all", "generate", "sync", "inject"]) {
      const rs = rows.filter((r) => r.arm === arm && (kind === "all" || r.kind === kind));
      const k = rs.filter((r) => r.s.pass).length;
      console.log(
        `| ${arm} | ${kind} | ${rs.length} | ${pct(k, rs.length)} (${ci(k, rs.length)}) | ${pct(rs.filter((r) => r.s.valid).length, rs.length)} | ${pct(rs.filter((r) => r.s.nestingErrors > 0).length, rs.length)} |`,
      );
    }
  console.log();
}
table("### As run (every seed counted)", scored);
// seeds that produced the identical answer to an earlier seed add no information
const seen = new Set();
const distinct = scored.filter((r) => {
  const key = `${r.provider}|${r.arm}|${r.taskId}|${r.answer}`;
  return seen.has(key) ? false : (seen.add(key), true);
});
table(`### Distinct answers only (${distinct.length} of ${scored.length})`, distinct);

console.log("### Diagnostic codes behind nesting errors (distinct answers)\n");
for (const arm of run.arms) {
  const c = new Map();
  for (const r of distinct.filter((x) => x.arm === arm))
    for (const e of r.s.errors) {
      const code = /^(E\d{4}|W\d{4})/.exec(e)?.[1];
      if (code !== undefined) c.set(code, (c.get(code) ?? 0) + 1);
    }
  console.log(
    `${arm}: ${
      [...c]
        .sort((a, b) => b[1] - a[1])
        .map(([k, n]) => `${k} x${n}`)
        .join(", ") || "none"
    }`,
  );
}
