import type { Cell, RunResult } from "./run.js";

const pct = (k: number, n: number): string => (n === 0 ? "n/a" : `${((k / n) * 100).toFixed(0)}%`);
const ci = (c: [number, number]): string =>
  `${(c[0] * 100).toFixed(0)}-${(c[1] * 100).toFixed(0)}%`;

/** Markdown table of cells. Every rate comes with its sample size and a 95% Wilson interval. */
export function renderCells(cells: readonly Cell[]): string {
  const head =
    "| Model | Arm | n | Pass | Pass 95% CI | Valid | Nesting errors | DSL only | Mean prompt tok | Mean output tok | Provider errors |\n|---|---|---|---|---|---|---|---|---|---|---|";
  const rows = cells.map(
    (c) =>
      `| ${c.provider} | ${c.arm} | ${c.n} | ${pct(c.pass, c.n)} | ${ci(c.passCI)} | ${pct(c.valid, c.n)} | ${pct(c.nesting, c.n)} | ${pct(c.onlyDsl, c.n)} | ${c.meanPromptTokens?.toFixed(0) ?? "n/a"} | ${c.meanCompletionTokens?.toFixed(0) ?? "n/a"} | ${c.errors} |`,
  );
  return `${head}\n${rows.join("\n")}\n`;
}

/** Paired comparison of two arms on the same (provider, task, seed) triples: counts, not a significance claim. */
export function compareArms(
  results: readonly RunResult[],
  provider: string,
  a: string,
  b: string,
): { pairs: number; bothPass: number; onlyA: number; onlyB: number; neither: number } {
  const key = (r: RunResult): string => `${r.taskId}|${r.seed}`;
  const A = new Map(
    results
      .filter((r) => r.provider === provider && r.arm === a && r.error === undefined)
      .map((r) => [key(r), r.score.pass]),
  );
  const B = new Map(
    results
      .filter((r) => r.provider === provider && r.arm === b && r.error === undefined)
      .map((r) => [key(r), r.score.pass]),
  );
  let bothPass = 0;
  let onlyA = 0;
  let onlyB = 0;
  let neither = 0;
  for (const [k, x] of A) {
    const y = B.get(k);
    if (y === undefined) continue;
    if (x && y) bothPass++;
    else if (x) onlyA++;
    else if (y) onlyB++;
    else neither++;
  }
  return { pairs: bothPass + onlyA + onlyB + neither, bothPass, onlyA, onlyB, neither };
}

/** Exact two-sided sign test on the discordant pairs (McNemar, exact). Returns 1 when there are none. */
export function signTest(onlyA: number, onlyB: number): number {
  const n = onlyA + onlyB;
  if (n === 0) return 1;
  const k = Math.min(onlyA, onlyB);
  let p = 0;
  let c = 1;
  for (let i = 0; i <= k; i++) {
    p += c;
    c = (c * (n - i)) / (i + 1);
  }
  return Math.min(1, (2 * p) / 2 ** n);
}
