#!/usr/bin/env node
// Grammar parity fuzz (T-058): strings generated from the grammar must parse with zero errors under the reference parser,
// and a sample must also be accepted by the Earley recogniser.   node scripts/grammar-parity.mjs [--n 100000] [--rec 100]
import { parse } from "../packages/core/dist/index.js";
import { buildGrammar, generator, recognizer } from "../packages/grammar/dist/index.js";

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? dflt : Number(process.argv[i + 1]);
};
const n = arg("n", 100_000);
const recN = arg("rec", 100);
let failed = 0;
for (const dsl of ["1", "2.0"]) {
  const g = buildGrammar({ dsl });
  const gen = generator(g);
  const rec = recognizer(g);
  let bad = 0;
  const t0 = Date.now();
  for (let seed = 1; seed <= n; seed++) {
    const doc = gen(seed);
    const errors = parse(doc).diagnostics.filter((d) => d.severity === "error");
    if (errors.length > 0 && bad++ < 3)
      console.log(`DSL ${dsl} seed ${seed}: ${errors.map((e) => e.code).join(",")}\n${doc}`);
    if (seed <= recN && !rec(doc).ok && bad++ < 3)
      console.log(`DSL ${dsl} seed ${seed}: recogniser rejected\n${doc}`);
  }
  console.log(
    `DSL ${dsl}: ${n} strings, ${bad} problem(s), ${((Date.now() - t0) / 1000).toFixed(1)}s`,
  );
  failed += bad;
}
process.exit(failed > 0 ? 1 : 0);
