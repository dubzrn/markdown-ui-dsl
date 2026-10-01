#!/usr/bin/env node
// Spec Oracle benchmark (T-077d): seeded mutations of rendered apps (recall) and semantic-preserving refactors (false positives).
//   node scripts/eval-nov02.mjs [--check]     needs Chromium (/opt/pw-browsers/chromium or CHROMIUM_PATH). Writes evals/NOV-02.md.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";
import { parse } from "../packages/core/dist/index.js";
import { render } from "../packages/render/dist/index.js";
import { expectedTree, match, parseAriaSnapshot } from "../packages/oracle/dist/index.js";

const exe = ["/opt/pw-browsers/chromium", process.env.CHROMIUM_PATH ?? ""].find(
  (p) => p !== "" && existsSync(p),
);
const root = new URL("../", import.meta.url);

// ---- the apps: every project example and SDD sample, rendered by the project's own renderer ----
const files = [
  ...readdirSync(new URL("examples/", root))
    .filter((f) => f.endsWith(".ui.md"))
    .map((f) => `examples/${f}`),
  "examples/sdd/spec-kit/specs/001-login/login.ui.md",
  "examples/sdd/openspec/openspec/specs/auth/login.ui.md",
  "examples/sdd/kiro/.kiro/specs/login/login.ui.md",
];
const apps = files.map((f) => {
  const spec = readFileSync(new URL(f, root), "utf8");
  return { name: f.split("/").pop(), spec, html: render(parse(spec), { style: "clean" }) };
});

// ---- deterministic randomness ----
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, list) => list[Math.floor(r() * list.length)];

// ---- mutations: each changes what a user sees or can do ----
const BUTTON = /<button\b[^>]*>[\s\S]*?<\/button>/g;
const LINK = /<a\b[^>]*>[\s\S]*?<\/a>/g;
const HEADING = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g;
const all = (re, s) => [...s.matchAll(re)];
const MUTATIONS = {
  "remove-button": (h, r) => {
    const m = all(BUTTON, h);
    return m.length === 0 ? undefined : replaceAt(h, pick(r, m), "");
  },
  "remove-link": (h, r) => {
    const m = all(LINK, h);
    return m.length === 0 ? undefined : replaceAt(h, pick(r, m), "");
  },
  "rename-button": (h, r) => {
    const m = all(/(<button\b[^>]*>)([\s\S]*?)(<\/button>)/g, h);
    if (m.length === 0) return undefined;
    const x = pick(r, m);
    const mm = replaceAt(
      h,
      x,
      `${x[1]}${x[2]}${x[2].includes("aria-label") ? "" : " Zeta"}${x[3]}`,
    );
    return mm.replace(/aria-label="([^"]*)"/, (a, b, off) =>
      off > x.index && off < x.index + x[0].length + 40 ? `aria-label="${b} Zeta"` : a,
    );
  },
  "button-to-div": (h, r) => {
    const m = all(/<button\b([^>]*)>([\s\S]*?)<\/button>/g, h);
    if (m.length === 0) return undefined;
    const x = pick(r, m);
    return replaceAt(
      h,
      x,
      `<div${x[1].replace(/\brole="[^"]*"/, "").replace(/aria-checked="[^"]*"/, "")}>${x[2]}</div>`,
    );
  },
  "link-to-span": (h, r) => {
    const m = all(/<a\b[^>]*>([\s\S]*?)<\/a>/g, h);
    if (m.length === 0) return undefined;
    const x = pick(r, m);
    return replaceAt(h, x, `<span>${x[1]}</span>`);
  },
  "drop-heading-semantics": (h, r) => {
    const m = all(HEADING, h);
    if (m.length === 0) return undefined;
    const x = pick(r, m);
    return replaceAt(h, x, `<div>${x[2]}</div>`);
  },
  "change-heading-level": (h, r) => {
    const m = all(HEADING, h);
    if (m.length === 0) return undefined;
    const x = pick(r, m);
    const to = x[1] === "6" ? "5" : String(Number(x[1]) + 1);
    return replaceAt(h, x, `<h${to}>${x[2]}</h${to}>`);
  },
  "unlabel-input": (h, r) => {
    const m = all(/<input\b[^>]*aria-label="[^"]*"[^>]*>/g, h);
    if (m.length === 0) return undefined;
    const x = pick(r, m);
    return replaceAt(
      h,
      x,
      x[0].replace(/\s*aria-label="[^"]*"/, "").replace(/\s*placeholder="[^"]*"/, ""),
    );
  },
  "rename-paragraph": (h, r) => {
    const m = all(/<p>([^<]{4,})<\/p>/g, h);
    if (m.length === 0) return undefined;
    const x = pick(r, m);
    return replaceAt(h, x, `<p>Totally different words here</p>`);
  },
  "swap-adjacent-controls": (h, r) => {
    const m = all(
      /(<button\b[^>]*>[\s\S]*?<\/button>)(\s*)(<button\b[^>]*>[\s\S]*?<\/button>)/g,
      h,
    );
    if (m.length === 0) return undefined;
    const x = pick(r, m);
    return x[1] === x[3] ? undefined : replaceAt(h, x, `${x[3]}${x[2]}${x[1]}`);
  },
  "remove-landmark": (h, r) => {
    const m = all(/<(header|footer|dialog)\b[^>]*>/g, h);
    if (m.length === 0) return undefined;
    const x = pick(r, m);
    return replaceAt(h, x, "<div>").replace(new RegExp(`</${x[1]}>`), "</div>");
  },
};
function replaceAt(s, m, text) {
  return s.slice(0, m.index) + text + s.slice(m.index + m[0].length);
}

// ---- refactors: the same app, written differently ----
const REFACTORS = {
  "wrap-in-divs": () => "",
  "add-classes": (h, r) =>
    h.replace(
      /<(button|a|p|h[1-6])\b/g,
      (m) => `${m} class="c${Math.floor(r() * 1000)}" data-x="${Math.floor(r() * 99)}"`,
    ),
  whitespace: (h) => h.replace(/>\s*</g, ">\n\n   <").replace(/<button([^>]*)>/g, "<button$1>  "),
  "attribute-order": (h) =>
    h.replace(
      /<button\b([^>]*)>/g,
      (m, a) =>
        `<button ${a
          .trim()
          .split(/\s+(?=[\w-]+=)/)
          .reverse()
          .join(" ")}>`,
    ),
  "inline-styles": (h) => h.replace(/<(button|a|p)\b/g, '<$1 style="margin:2px;color:#123"'),
  "extra-decorative": (h) =>
    h.replace(/<main\b[^>]*>/, (m) => `${m}<div aria-hidden="true">decoration</div><hr>`),
};
// wrapping must keep the markup well formed: wrap whole elements
REFACTORS["wrap-in-divs"] = (h, r) =>
  h.replace(/(<(button|a|h[1-6]|p)\b[^>]*>[\s\S]*?<\/\2>)/g, (m) =>
    r() < 0.5 ? `<div class="w${Math.floor(r() * 99)}"><span>${m}</span></div>` : m,
  );

// ---- run ----
const browser = await chromium.launch(exe !== undefined ? { executablePath: exe } : {});
const t0 = Date.now();
let slowest = 0;
async function score(app, html) {
  const page = await browser.newPage();
  try {
    await page.setContent(html);
    const s0 = Date.now();
    const snap = await page.locator("body").ariaSnapshot();
    const rep = match(expectedTree(parse(app.spec)), parseAriaSnapshot(snap));
    slowest = Math.max(slowest, Date.now() - s0);
    return { rep, bad: rep.verdicts.filter((v) => v.verdict !== "present").length };
  } finally {
    await page.close();
  }
}

const rows = [];
const perMutation = {};
let detected = 0;
let total = 0;
let refactors = 0;
let falsePos = 0;
const perRefactor = {};
for (const app of apps) {
  const base = await score(app, app.html);
  let n = 0;
  for (let seed = 1; n < 24 && seed < 400; seed++) {
    const r = rng(seed * 2654435761 + app.name.length);
    const kind = Object.keys(MUTATIONS)[seed % Object.keys(MUTATIONS).length];
    const mutated = MUTATIONS[kind](app.html, r);
    if (mutated === undefined || mutated === app.html) continue;
    n++;
    const s = await score(app, mutated);
    const hit = s.bad > base.bad || s.rep.fidelity < base.rep.fidelity - 1e-9;
    total++;
    perMutation[kind] ??= { n: 0, hit: 0 };
    perMutation[kind].n++;
    if (hit) {
      detected++;
      perMutation[kind].hit++;
    }
  }
  let rn = 0;
  let rfp = 0;
  for (const [kind, fn] of Object.entries(REFACTORS))
    for (let seed = 1; seed <= 4; seed++) {
      const out = fn(app.html, rng(seed * 97 + kind.length));
      const s = await score(app, out);
      rn++;
      refactors++;
      perRefactor[kind] ??= { n: 0, fp: 0 };
      perRefactor[kind].n++;
      if (s.bad > base.bad || s.rep.fidelity < base.rep.fidelity - 1e-9) {
        rfp++;
        falsePos++;
        perRefactor[kind].fp++;
      }
    }
  rows.push(
    `| ${app.name} | ${(base.rep.fidelity * 100).toFixed(1)}% | ${n} | ${rows.length >= 0 ? "" : ""}${rn} | ${rfp} |`,
  );
}
await browser.close();

const recall = detected / total;
const fpRate = falsePos / refactors;
const md = `# NOV-02 Spec Oracle benchmark

Generated by \`node scripts/eval-nov02.mjs\` (Chromium via Playwright).

| Metric | Result | Target |
|---|---|---|
| Apps | ${apps.length} (every project example and SDD sample, rendered by \`@mdui/render\`) | >= 10 |
| Seeded mutations | ${total} (>= ${Math.min(...rows.map((r) => Number(r.split("|")[3])))} per app) | >= 20 per app |
| **Recall** (mutation changes the verdicts or the score) | **${detected}/${total} = ${(recall * 100).toFixed(1)}%** | >= 90% |
| Semantic-preserving refactors | ${refactors} | |
| **False positives** on refactors | **${falsePos}/${refactors} = ${(fpRate * 100).toFixed(1)}%** | <= 5% |
| Slowest screen (snapshot + match) | ${slowest} ms | <= 5000 ms |
| Whole run | ${((Date.now() - t0) / 1000).toFixed(1)} s | |

A mutation counts as detected when it produces more non-present verdicts, or a lower Fidelity Score, than the unmutated app. The baseline is each app's own unmutated score (not 100%): known divergences between a spec and its rendering are not counted as detections.

## By mutation
| Mutation | Applied | Detected |
|---|---|---|
${Object.entries(perMutation)
  .map(([k, v]) => `| ${k} | ${v.n} | ${v.hit} |`)
  .join("\n")}

## By refactor
| Refactor | Applied | False positives |
|---|---|---|
${Object.entries(perRefactor)
  .map(([k, v]) => `| ${k} | ${v.n} | ${v.fp} |`)
  .join("\n")}

## By app
| App | Baseline fidelity | Mutations | Refactors | False positives |
|---|---|---|---|---|
${rows.join("\n")}

Limits: the apps are rendered by this project's own renderer, so they are closer to their specs than hand-written application code would be; mutations are textual edits of that HTML, not edits of real component code. The numbers show the matcher separates semantic changes from refactors on these ten screens; they are not a measurement on third-party applications.
`;
writeFileSync(new URL("evals/NOV-02.md", root), md);
console.log(
  `recall ${detected}/${total} (${(recall * 100).toFixed(1)}%), false positives ${falsePos}/${refactors} (${(fpRate * 100).toFixed(1)}%), slowest ${slowest} ms`,
);
if (
  process.argv.includes("--check") &&
  (recall < 0.9 || fpRate > 0.05 || slowest > 5000 || apps.length < 10)
)
  process.exit(1);
