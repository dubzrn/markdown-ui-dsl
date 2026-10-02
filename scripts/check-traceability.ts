// Usage: node scripts/check-traceability.ts   (Node >= 22.18 runs TypeScript natively)
import { readFileSync } from "node:fs";
import { checkTraceability } from "./lib/traceability.ts";

const read = (f: string): string => readFileSync(new URL(`../docs/${f}`, import.meta.url), "utf8");
const r = checkTraceability(read("FEATURE_ADDITIONS.md"), read("SPEC.md"), read("TASKS.md"));
for (const e of r.errors) console.error("FAIL", e);
console.log(
  `${r.features.length} features · ${r.reqs.length} requirements · ${r.tasks.length} tasks · ${r.errors.length} problem(s)`,
);
process.exit(r.errors.length ? 1 : 0);
