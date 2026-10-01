#!/usr/bin/env node
// Corpus for the engine smoke test (T-060): documents the grammar must accept, and broken ones it must refuse.
//   node scripts/engine-corpus.mjs [--n 25]  > corpus.json
import { buildGrammar, generator } from "../packages/grammar/dist/index.js";

const i = process.argv.indexOf("--n");
const n = i === -1 ? 25 : Number(process.argv[i + 1]);
const gen = generator(buildGrammar({ dsl: "2.0", maxDepth: 3 }), { maxNest: 2, budget: 260 });
const good = [];
for (let seed = 1; good.length < n && seed < 5000; seed++) {
  const d = gen(seed);
  if (d.includes("--- END") && d.length < 700) good.push(d);
}
const H = "---\ndsl: 2.0\n---\n";
const bad = [
  `${H}::: CARD :::\nHello\n`, // unclosed
  `${H}--- END ---\n`, // orphan closer
  `${H}::: CARD :::\n--- END ROW ---\n`, // mismatched typed closer
  `${H}[ BOGUS: x ]\n`, // unknown widget
  `${H}::: BOGUS :::\n--- END ---\n`, // unknown container
  `${H}||| COLUMN |||\n::: CARD :::\n--- END ---\n`, // inner closed, outer not
  `${H}::: STATE ready :::\n--- END STATE ---\n`, // STATE outside REGION
];
process.stdout.write(JSON.stringify({ good, bad }) + "\n");
