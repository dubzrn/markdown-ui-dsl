#!/usr/bin/env node
// LLM evaluation harness (T-063) and constrained-decoding benchmark (T-061).
//
//   node scripts/eval-llm.mjs --provider ollama --model ornith-1.5:9b --arms none,skill,prompt
//   node scripts/eval-llm.mjs --provider llamacpp --label ornith --arms none,none+grammar,skill,skill+grammar --nov03
//   node scripts/eval-llm.mjs --provider mock --replay evals/fixtures/reference-answers.json --arms none     (dry run, synthetic)
//
// Options: --provider ollama|llamacpp|openai|mock  --model M (repeat or comma list: a panel)  --base-url U  --api-key K (or $LLM_API_KEY)
//          --arms none,skill,prompt,<arm>+grammar  --tasks all|generate|sync|inject|id,id  --seeds 1,2,3  --temperature 0
//          --max-tokens 1500  --num-ctx 8192 (ollama)  --catalog catalog.yaml  --out evals/results/<name>.json  --min-pass 0.8  --min-valid 0.9
//          --baseline (write evals/BASELINE.md)  --nov03 (write evals/NOV-03.md)  --replay file  --record file
// Exit codes: 0 ok, 1 below a --min-* threshold, 2 usage error. Raw answers are stored so every number can be re-scored.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { loadCatalog } from "../packages/catalog/dist/index.js";
import {
  ALL_TASKS,
  GENERATION,
  INJECTION,
  SYNC,
  compareArms,
  llamacpp,
  ollama,
  openaiCompatible,
  renderCells,
  replay,
  run,
  signTest,
  summarise,
} from "../packages/evals/dist/index.js";

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? dflt : argv[i + 1];
};
const all = (name) =>
  argv.flatMap((a, i) => (a === `--${name}` ? String(argv[i + 1]).split(",") : []));
const die = (m) => {
  console.error(`eval-llm: ${m}`);
  process.exit(2);
};

const providerName = opt("provider", "mock");
const models = all("model");
const armNames = opt("arms", "none,skill,prompt").split(",").filter(Boolean);
const arms = armNames.map((a) => {
  const [context, c] = a.split("+");
  if (!["none", "skill", "prompt"].includes(context) || (c !== undefined && c !== "grammar"))
    die(`bad arm "${a}" (use none|skill|prompt, optionally +grammar)`);
  return { context, constrained: c === "grammar" };
});
const which = opt("tasks", "all");
const tasks =
  which === "all"
    ? ALL_TASKS
    : which === "generate"
      ? GENERATION
      : which === "sync"
        ? SYNC
        : which === "inject"
          ? INJECTION
          : ALL_TASKS.filter((t) => which.split(",").includes(t.id));
if (tasks.length === 0) die(`no tasks match --tasks ${which}`);
const seeds = opt("seeds", "1").split(",").map(Number);
const temperature = Number(opt("temperature", "0"));

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const skill = [
  read("skills/markdown-ui-dsl/SKILL.md"),
  read("skills/markdown-ui-dsl/references/syntax.md"),
  read("skills/markdown-ui-dsl/references/v2-additions.md"),
  read("skills/markdown-ui-dsl/references/safety.md"),
].join("\n\n---\n\n");
const catalog = opt("catalog")
  ? loadCatalog(readFileSync(opt("catalog"), "utf8")).catalog
  : undefined;

const makeProvider = (model) => {
  const base = opt("base-url");
  if (providerName === "ollama")
    return ollama(model ?? die("--model is required for ollama"), {
      ...(base ? { baseUrl: base } : {}),
      numCtx: Number(opt("num-ctx", "8192")),
    });
  if (providerName === "llamacpp")
    return llamacpp({ ...(base ? { baseUrl: base } : {}), label: model ?? opt("label", "server") });
  if (providerName === "openai")
    return openaiCompatible(model ?? die("--model is required"), {
      baseUrl: base ?? die("--base-url is required for openai"),
      apiKey: opt("api-key", process.env.LLM_API_KEY),
    });
  if (providerName === "mock") {
    const f = opt("replay") ?? die("--replay <file> is required for the mock provider");
    const rec = JSON.parse(readFileSync(f, "utf8"));
    const answers = rec.answers ?? rec;
    const table = {};
    for (const [k, v] of Object.entries(answers)) for (const a of armNames) table[`${k}|${a}`] = v;
    return replay(table, "synthetic-reference", { grammar: true });
  }
  return die(`unknown provider ${providerName}`);
};
const panel = models.length > 0 ? models : [undefined];

const results = [];
let done = 0;
const total = panel.length * arms.length * tasks.length * seeds.length;
for (const m of panel) {
  const provider = makeProvider(m);
  const rs = await run({
    provider,
    tasks,
    arms,
    contexts: { skill },
    ...(catalog ? { catalog } : {}),
    seeds,
    temperature,
    maxTokens: Number(opt("max-tokens", "1500")),
    onResult: () => {
      if (++done % 10 === 0 || done === total) process.stderr.write(`\r${done}/${total}`);
    },
  });
  results.push(...rs);
}
process.stderr.write("\n");

const cells = summarise(results);
// Provider errors are counted in the table; say what they were (a bad key, a wrong model alias, an unreachable host) once each.
const errs = new Map();
for (const r of results)
  if (r.error !== undefined)
    errs.set(String(r.error).slice(0, 300), (errs.get(String(r.error).slice(0, 300)) ?? 0) + 1);
for (const [msg, n] of errs) console.error(`provider error (x${n}): ${msg}`);
const out = opt("out");
if (out) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(
    out,
    JSON.stringify(
      {
        when: new Date().toISOString(),
        provider: providerName,
        models,
        arms: armNames,
        seeds,
        temperature,
        tasks: tasks.map((t) => t.id),
        ...(catalog ? { catalog } : {}),
        results,
      },
      null,
      2,
    ) + "\n",
  );
}
if (opt("record")) {
  const rec = {};
  for (const r of results) if (!r.error) rec[`${r.taskId}|${r.arm}`] = r.answer;
  writeFileSync(opt("record"), JSON.stringify(rec, null, 2) + "\n");
}
console.log(renderCells(cells));
const synthetic = providerName === "mock";

const stamp = `Run on ${new Date().toISOString().slice(0, 10)} with ${panel.map((m) => `${providerName}:${m ?? "default"}`).join(", ")}; ${tasks.length} tasks x ${seeds.length} seed(s) x ${arms.length} arm(s), temperature ${temperature}.`;
if (flag("baseline") && !synthetic) {
  const rows = cells.filter((c) => !c.arm.includes("grammar"));
  writeFileSync(
    new URL("evals/BASELINE.md", root),
    `# Baseline: how models write the DSL today (B-03 hypothesis)\n\n${stamp}\n\nB-03 hypothesised that models make block-nesting errors when writing v1 without help. "Nesting errors" below is the share of answers with an unclosed block, orphan closer or mismatched typed closer. Rates carry their sample size; intervals are 95% Wilson.\n\n${renderCells(rows)}\nRaw answers: re-score with \`--replay\`. Not a benchmark of the models in general: one task set, this project's own scoring.\n`,
  );
  console.log("wrote evals/BASELINE.md");
}
if (flag("nov03") && !synthetic) {
  const lines = [`# NOV-03 constrained-decoding benchmark\n`, `${stamp}\n`, renderCells(cells)];
  for (const prov of [...new Set(cells.map((c) => c.provider))])
    for (const ctx of ["none", "skill", "prompt"]) {
      if (!armNames.includes(ctx) || !armNames.includes(`${ctx}+grammar`)) continue;
      const c = compareArms(results, prov, `${ctx}+grammar`, ctx);
      lines.push(
        `**${prov}, ${ctx}: grammar vs no grammar** (${c.pairs} paired runs): only grammar passes ${c.onlyA}, only unconstrained passes ${c.onlyB}, both ${c.bothPass}, neither ${c.neither}; exact sign test p = ${signTest(c.onlyA, c.onlyB).toFixed(4)}.\n`,
      );
    }
  lines.push(
    'Scope: structural validity, nesting errors and catalog adherence are deterministic (`mdui lint`). "Pass" also needs the task\'s own content assertions; it is a proxy for quality, not a human or LLM-judged semantic score. A grammar guarantees structure, not that the content is good.\n',
  );
  writeFileSync(new URL("evals/NOV-03.md", root), lines.join("\n"));
  console.log("wrote evals/NOV-03.md");
}

let bad = false;
const minPass = opt("min-pass");
const minValid = opt("min-valid");
for (const c of cells) {
  if (c.n === 0) {
    console.error(`${c.provider} ${c.arm}: no scored runs (${c.errors} provider errors)`);
    bad = true;
    continue;
  }
  if (minPass !== undefined && c.pass / c.n < Number(minPass)) {
    console.error(
      `${c.provider} ${c.arm}: pass ${((c.pass / c.n) * 100).toFixed(0)}% < ${Number(minPass) * 100}%`,
    );
    bad = true;
  }
  if (minValid !== undefined && c.valid / c.n < Number(minValid)) {
    console.error(
      `${c.provider} ${c.arm}: valid ${((c.valid / c.n) * 100).toFixed(0)}% < ${Number(minValid) * 100}%`,
    );
    bad = true;
  }
}
if (synthetic)
  console.error(
    "note: the mock provider replays SYNTHETIC reference answers; this is a harness dry run, not a result.",
  );
process.exit(bad ? 1 : 0);
