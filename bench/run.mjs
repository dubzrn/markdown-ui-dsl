// T-044 benchmark harness: `pnpm bench` (prints) · `pnpm bench --check` (enforces budgets) · `--write` (refresh baseline).
// Needs `pnpm build`. Budgets are absolute (SPEC §6); the committed baseline records the reference run for trend review.
import fs from "node:fs";
import os from "node:os";
import { performance } from "node:perf_hooks";
import { StreamParser, format, parse } from "../packages/core/dist/index.js";
import { lint } from "../packages/lint/dist/index.js";
import { render } from "../packages/render/dist/index.js";

const BUDGETS_MS = {
  parse1000: 50,
  format1000: 150,
  lint1000: 150,
  render1000: 150,
  streamChunk: 5,
};

const dir = new URL("../examples/", import.meta.url);
const examples = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".ui.md"))
  .map((f) => fs.readFileSync(new URL(f, dir), "utf8").replace(/^---[\s\S]*?\n---\n/, ""));

/** A body of at least `n` lines built from the shipped examples (frontmatter stripped, containers balanced). */
function docOfLines(n) {
  const out = [];
  let i = 0;
  while (out.length < n) out.push(...examples[i++ % examples.length].split("\n"));
  return out.join("\n") + "\n";
}

function median(fn, runs = 15) {
  fn(); // warm-up
  const t = [];
  for (let i = 0; i < runs; i++) {
    const s = performance.now();
    fn();
    t.push(performance.now() - s);
  }
  t.sort((a, b) => a - b);
  return t[Math.floor(t.length / 2)];
}

const src = docOfLines(1000);
const lines = src.split("\n").length;

// streaming: feed the document in ~64-byte chunks; report the median and worst per-chunk time
function streamChunks() {
  const p = new StreamParser();
  const times = [];
  for (let i = 0; i < src.length; i += 64) {
    const s = performance.now();
    p.push(src.slice(i, i + 64));
    times.push(performance.now() - s);
  }
  p.end();
  times.sort((a, b) => a - b);
  return {
    median: times[Math.floor(times.length / 2)],
    p95: times[Math.floor(times.length * 0.95)],
    max: times[times.length - 1],
  };
}
const stream = streamChunks();
const results = {
  lines,
  parse1000: median(() => parse(src)),
  format1000: median(() => format(src)),
  lint1000: median(() => lint(src)),
  render1000: median(() => render(parse(src), { style: "none" })),
  streamChunk: stream.p95,
  streamChunkMedian: stream.median,
  streamChunkMax: stream.max,
};

const machine = {
  node: process.version,
  cpu: os.cpus()[0]?.model ?? "unknown",
  cores: os.cpus().length,
  platform: `${os.platform()} ${os.arch()}`,
};
const round = (o) =>
  Object.fromEntries(
    Object.entries(o).map(([k, v]) => [k, typeof v === "number" ? Math.round(v * 100) / 100 : v]),
  );
console.log(JSON.stringify({ machine, results: round(results), budgetsMs: BUDGETS_MS }, null, 2));

if (process.argv.includes("--write")) {
  fs.writeFileSync(
    new URL("baseline.json", import.meta.url),
    JSON.stringify({ machine, results: round(results), budgetsMs: BUDGETS_MS }, null, 2) + "\n",
  );
}
// trend: >20% (+1 ms) slower than the committed baseline is reported, never fatal (runner hardware differs)
try {
  const base = JSON.parse(
    fs.readFileSync(new URL("baseline.json", import.meta.url), "utf8"),
  ).results;
  for (const k of Object.keys(BUDGETS_MS))
    if (base[k] !== undefined && results[k] > base[k] * 1.2 + 1)
      console.error(`TREND ${k}: ${results[k].toFixed(2)} ms vs baseline ${base[k]} ms`);
} catch {
  /* no baseline yet */
}
if (process.argv.includes("--check")) {
  const bad = Object.entries(BUDGETS_MS).filter(([k, b]) => results[k] > b);
  for (const [k, b] of bad)
    console.error(`BUDGET EXCEEDED ${k}: ${results[k].toFixed(2)} ms > ${b} ms`);
  process.exit(bad.length ? 1 : 0);
}
