#!/usr/bin/env node
// Static documentation site + in-browser playground (T-092). No framework, no server, no network at run time.
//   node scripts/build-site.mjs [--out site-dist] [--check]
// --check builds into a temporary directory and fails on: a broken internal link or anchor, a diagnostic code without a page,
// a missing playground bundle, or a page without a title. Output is deterministic.
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import MarkdownIt from "markdown-it";
import { CODES } from "../packages/core/dist/index.js";
import { ALL_RULES } from "../packages/lint/dist/index.js";
import { markdownItMdui } from "../packages/embed/dist/index.js";

const root = resolve(new URL("..", import.meta.url).pathname);
const args = process.argv.slice(2);
const check = args.includes("--check");
const outDir = check
  ? mkdtempSync(join(tmpdir(), "mdui-site-"))
  : resolve(root, args[args.indexOf("--out") + 1] ?? "site-dist");
const GH = "https://github.com/dubzrn/markdown-ui-dsl";
const errors = [];

const read = (p) => readFileSync(join(root, p), "utf8");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s/g, "-");

// ---------------------------------------------------------------- pages
const docs = readdirSync(join(root, "docs"))
  .filter((f) => f.endsWith(".md"))
  .sort();
const group = (f) =>
  /^(SPEC|GRAMMAR|CONSTRAINTS|SYNC|ORACLE)\.md$/.test(f)
    ? "Specification"
    : /^(MCP|EXPORT|EMBED|CONFORMANCE|LINT_RULES|SDD_INTEROP|EVALS)\.md$/.test(f)
      ? "Reference"
      : "Project";
const pages = [{ src: "README.md", out: "index.html", group: "Start", nav: "Home" }];
for (const f of readdirSync(join(root, "docs/guides"))
  .filter((x) => x.endsWith(".md"))
  .sort())
  pages.push({
    src: `docs/guides/${f}`,
    out: `guides/${f.replace(/\.md$/, ".html")}`,
    group: "Start",
  });
for (const f of docs)
  pages.push({ src: `docs/${f}`, out: `docs/${f.replace(/\.md$/, ".html")}`, group: group(f) });
for (const d of ["adr", "rfcs"])
  for (const f of readdirSync(join(root, "docs", d))
    .filter((x) => x.endsWith(".md"))
    .sort())
    pages.push({
      src: `docs/${d}/${f}`,
      out: `docs/${d}/${f.replace(/\.md$/, ".html")}`,
      group: "Project",
    });
for (const f of ["CHANGELOG.md", "CONTRIBUTING.md"])
  pages.push({ src: f, out: `docs/${f.replace(/\.md$/, ".html")}`, group: "Project" });
for (const f of readdirSync(join(root, "skills/markdown-ui-dsl/references"))
  .filter((x) => x.endsWith(".md"))
  .sort())
  pages.push({
    src: `skills/markdown-ui-dsl/references/${f}`,
    out: `skill/${f.replace(/\.md$/, ".html")}`,
    group: "Skill reference",
  });
pages.push({
  src: "skills/markdown-ui-dsl/SKILL.md",
  out: "skill/SKILL.html",
  group: "Skill reference",
  nav: "SKILL.md",
});
const bySrc = new Map(pages.map((p) => [p.src, p]));
const assets = new Map(); // repo path -> site path

// ---------------------------------------------------------------- markdown
function makeMd(page) {
  const md = new MarkdownIt({ html: false, linkify: false });
  md.use(markdownItMdui);
  const seen = new Map();
  // Keyboard users must be able to scroll wide code and tables (axe: scrollable-region-focusable).
  const fence = md.renderer.rules.fence;
  md.renderer.rules.fence = (...a) => {
    const html = fence(...a);
    return html.startsWith("<pre>") ? `<pre tabindex="0"${html.slice(4)}` : html;
  };
  let tables = 0;
  md.renderer.rules.table_open = () =>
    `<div class="tw" role="group" aria-label="Table ${++tables}" tabindex="0"><table>\n`;
  md.renderer.rules.table_close = () => "</table></div>\n";
  md.core.ruler.push("mdui_site", (state) => {
    seen.clear();
    const toks = state.tokens;
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (
        t.type === "th_open" &&
        toks[i + 1].type === "inline" &&
        toks[i + 1].content.trim() === ""
      ) {
        const h = new state.Token("html_inline", "", 0);
        h.content = '<span class="sr">(empty)</span>';
        toks[i + 1].children = [h];
      }
      if (t.type === "heading_open") {
        const text = toks[i + 1].children?.map((c) => c.content).join("") ?? "";
        let id = slug(text) || "section";
        const n = seen.get(id) ?? 0;
        seen.set(id, n + 1);
        if (n > 0) id = `${id}-${n}`;
        t.attrSet("id", id);
        page.headings.push({ level: Number(t.tag.slice(1)), text, id });
      }
      for (const c of t.children ?? []) {
        if (c.type === "link_open") c.attrSet("href", fixLink(page, c.attrGet("href") ?? ""));
        if (c.type === "image") c.attrSet("src", fixLink(page, c.attrGet("src") ?? "", true));
      }
    }
  });
  return md;
}
function fixLink(page, href, isAsset = false) {
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href;
  if (href.startsWith("#")) return href;
  // `site:<path>` links to a generated page that has no Markdown source (playground, diagnostics)
  if (href.startsWith("site:")) return posix.relative(posix.dirname(page.out), href.slice(5));
  const [path, hash] = href.split("#");
  const target = posix.normalize(
    posix.join(posix.dirname(page.src), decodeURIComponent(path ?? "")),
  );
  const rel = (to) => posix.relative(posix.dirname(page.out), to);
  const tp = bySrc.get(target);
  if (tp !== undefined) return rel(tp.out) + (hash !== undefined ? `#${hash}` : "");
  if (!existsSync(join(root, target))) {
    errors.push(`${page.src}: broken link ${href}`);
    return href;
  }
  if (isAsset || /\.(svg|png|jpg|gif)$/i.test(target)) {
    assets.set(target, `assets/${target}`);
    return rel(`assets/${target}`);
  }
  return `${GH}/${statSync(join(root, target)).isDirectory() ? "tree" : "blob"}/main/${target}`;
}

// ---------------------------------------------------------------- templates
const NAV_GROUPS = ["Start", "Specification", "Reference", "Skill reference", "Project"];
function shell({ title, out, body, current }) {
  const depth =
    posix.dirname(out) === "." ? "" : "../".repeat(posix.dirname(out).split("/").length);
  const li = (href, text, cur) =>
    `<li><a href="${depth}${href}"${cur ? ' aria-current="page"' : ""}>${esc(text)}</a></li>`;
  const nav = NAV_GROUPS.map((g) => {
    const items = pages
      .filter((p) => p.group === g)
      .map((p) => li(p.out, p.nav ?? p.title, p.out === current));
    if (g === "Reference") {
      items.unshift(li("playground.html", "Playground", current === "playground.html"));
      items.push(
        li("diagnostics/index.html", "Diagnostic codes", current === "diagnostics/index.html"),
      );
    }
    return `<h2>${g}</h2><ul>${items.join("")}</ul>`;
  }).join("");
  return `<!doctype html>
<html lang="en" data-root="${depth}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · Markdown UI DSL</title><link rel="stylesheet" href="${depth}assets/site.css"></head>
<body><a class="skip" href="#content">Skip to content</a>
<header class="top"><a class="brand" href="${depth}index.html">Markdown UI DSL</a>
<a href="${depth}playground.html">Playground</a><a href="${depth}diagnostics/index.html">Diagnostics</a><a href="${GH}">GitHub</a>
<form role="search" onsubmit="return false"><label class="sr" for="q" style="position:absolute;left:-999px">Search the documentation</label><input id="q" type="search" placeholder="Search docs" autocomplete="off" aria-controls="results"><ul id="results" hidden></ul></form></header>
<div class="layout"><nav class="side" aria-label="Documentation">${nav}</nav><main id="content">
${body}
</main></div>
<footer>Generated by <code>scripts/build-site.mjs</code>. Pre-release: nothing here is published yet.</footer>
<script src="${depth}assets/search-index.js"></script><script src="${depth}assets/search.js"></script></body></html>
`;
}

// ---------------------------------------------------------------- build
const outputs = new Map(); // site path -> text | Buffer
const index = [];
for (const page of pages) {
  page.headings = [];
  const src = read(page.src);
  const md = makeMd(page);
  const html = md.render(src);
  page.title = (page.headings.find((h) => h.level === 1) ?? page.headings[0])?.text ?? page.src;
  page.html = html;
  index.push({
    u: page.out,
    t: page.title,
    k: page.group,
    h: page.headings.map((h) => h.text).join(" "),
    x: src
      .toLowerCase()
      .replace(/[`*#>|[\]()]/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 6000),
  });
}
for (const page of pages)
  outputs.set(
    page.out,
    shell({ title: page.title, out: page.out, body: page.html, current: page.out }),
  );

// diagnostics: one page per code
const bandNames = {
  1: "Syntax",
  2: "Semantics",
  3: "Accessibility",
  4: "Tokens",
  5: "Constraints and flows",
  6: "Catalog",
  7: "Safety",
  8: "Other",
};
const codes = Object.entries(CODES).sort(
  ([a], [b]) => a.slice(1).localeCompare(b.slice(1)) || a.localeCompare(b),
);
for (const [code, info] of codes) {
  const rules = ALL_RULES.filter((r) => r.codes.includes(code));
  const wcag = [...new Set(rules.flatMap((r) => r.wcag ?? []))];
  const body = `<h1><code>${code}</code> <span class="badge">${info.severity}</span></h1>
<p>${esc(info.summary)}</p>
<h2>Where it comes from</h2>
${rules.length === 0 ? "<p>Raised by the parser or analyser (not a configurable lint rule).</p>" : `<table><thead><tr><th>Rule</th><th>Category</th><th>Default</th><th>What it checks</th></tr></thead><tbody>${rules.map((r) => `<tr><td><code>${esc(r.id)}</code></td><td>${esc(r.category)}</td><td>${esc(r.defaultSeverity)}</td><td>${esc(r.description)}</td></tr>`).join("")}</tbody></table>`}
${wcag.length > 0 ? `<h2>WCAG 2.2</h2><p>${wcag.map((c) => `SC ${esc(c)}`).join(", ")}</p>` : ""}
<h2>Silencing</h2>
<p>${rules.length > 0 ? `Set <code>"${esc(rules[0].id)}": "off"</code> in <code>mdui.config.json</code>, put <code>&lt;!-- mdui-disable ${esc(rules[0].id)} --&gt;</code> on the line above, or waive it in the spec with <code>&gt; waive: ${esc(rules[0].id)} reason="…"</code>.` : "Syntax and structure errors cannot be silenced; fix the source."}</p>
<p><a href="index.html">All diagnostic codes</a> · <a href="../docs/LINT_RULES.html">Lint rules</a></p>`;
  outputs.set(
    `diagnostics/${code}.html`,
    shell({
      title: code,
      out: `diagnostics/${code}.html`,
      body,
      current: "diagnostics/index.html",
    }),
  );
  index.push({
    u: `diagnostics/${code}.html`,
    t: `${code} ${info.summary}`,
    k: "Diagnostic",
    h: rules.map((r) => r.id).join(" "),
    x: info.summary.toLowerCase(),
  });
}
const byBand = {};
for (const [code, info] of codes) (byBand[code[1]] ??= []).push([code, info]);
const dindex =
  `<h1>Diagnostic codes</h1><p>${codes.length} codes. The letter is the default severity (E error, W warning, I info); the first digit is the area.</p>` +
  Object.entries(byBand)
    .map(
      ([b, list]) =>
        `<h2>${bandNames[b] ?? "Other"} (${b}xxx)</h2><table><thead><tr><th>Code</th><th>Severity</th><th>Summary</th></tr></thead><tbody>${list.map(([c, i]) => `<tr><td><a href="${c}.html"><code>${c}</code></a></td><td>${i.severity}</td><td>${esc(i.summary)}</td></tr>`).join("")}</tbody></table>`,
    )
    .join("");
outputs.set(
  "diagnostics/index.html",
  shell({
    title: "Diagnostic codes",
    out: "diagnostics/index.html",
    body: dindex,
    current: "diagnostics/index.html",
  }),
);
index.push({
  u: "diagnostics/index.html",
  t: "Diagnostic codes",
  k: "Reference",
  h: "",
  x: "diagnostic codes index",
});

// playground
const playground = `<h1>Playground</h1>
<p>Parses, lints and previews entirely in this page: no server, no upload. The link in the address bar encodes your text.</p>
<div class="pg"><div><div class="bar"><label>Style <select id="style"><option>clean</option><option>wireframe</option><option>sketch</option></select></label>
<label>Theme <select id="theme"><option>auto</option><option>light</option><option>dark</option></select></label>
<label>State <input id="state" size="10" placeholder="default"></label></div>
<label for="src">Source (<code>.ui.md</code>)</label><textarea id="src" spellcheck="false" aria-describedby="status"></textarea><p id="status" role="status">Loading…</p></div>
<div><div role="tablist" aria-label="Output">
<button role="tab" id="t-preview" aria-controls="p-preview">Preview</button><button role="tab" id="t-svg" aria-controls="p-svg">SVG</button><button role="tab" id="t-diag" aria-controls="p-diag">Diagnostics</button><button role="tab" id="t-outline" aria-controls="p-outline">Outline</button><button role="tab" id="t-a2ui" aria-controls="p-a2ui">A2UI</button><button role="tab" id="t-jr" aria-controls="p-jr">json-render</button></div>
<div role="tabpanel" id="p-preview" aria-labelledby="t-preview"><iframe title="Rendered wireframe" sandbox=""></iframe></div>
<div role="tabpanel" id="p-svg" aria-labelledby="t-svg" hidden></div>
<div role="tabpanel" id="p-diag" aria-labelledby="t-diag" hidden></div>
<div role="tabpanel" id="p-outline" aria-labelledby="t-outline" hidden><pre></pre></div>
<div role="tabpanel" id="p-a2ui" aria-labelledby="t-a2ui" hidden><pre></pre></div>
<div role="tabpanel" id="p-jr" aria-labelledby="t-jr" hidden><pre></pre></div></div></div>
<noscript><p>The playground needs JavaScript.</p></noscript>
<script src="assets/playground.js"></script><script src="assets/playground-ui.js"></script>`;
outputs.set(
  "playground.html",
  shell({
    title: "Playground",
    out: "playground.html",
    body: playground,
    current: "playground.html",
  }),
);
index.push({
  u: "playground.html",
  t: "Playground",
  k: "Tool",
  h: "parse lint preview",
  x: "playground try in the browser parse lint preview render svg",
});

outputs.set("assets/site.css", readFileSync(join(root, "site-src/site.css")));
outputs.set("assets/search.js", readFileSync(join(root, "site-src/search.js")));
outputs.set("assets/playground-ui.js", readFileSync(join(root, "site-src/playground-ui.js")));
index.sort((a, b) => (a.u < b.u ? -1 : 1));
outputs.set("assets/search-index.js", `window.__MDUI_INDEX=${JSON.stringify(index)};\n`);

// playground bundle
const tmp = mkdtempSync(join(tmpdir(), "mdui-pg-"));
execFileSync(
  "pnpm",
  [
    "exec",
    "tsup",
    "site-src/playground.ts",
    "--format",
    "iife",
    "--platform",
    "browser",
    "--minify",
    "--out-dir",
    tmp,
    "--no-config",
    "--silent",
  ],
  { cwd: root, stdio: "pipe" },
);
outputs.set("assets/playground.js", readFileSync(join(tmp, "playground.global.js")));
rmSync(tmp, { recursive: true, force: true });
for (const [repoPath, sitePath] of assets)
  outputs.set(sitePath, readFileSync(join(root, repoPath)));

// ---------------------------------------------------------------- write + verify
for (const [p, data] of outputs) {
  mkdirSync(dirname(join(outDir, p)), { recursive: true });
  writeFileSync(join(outDir, p), data);
}
const ids = new Map();
for (const [p, data] of outputs)
  if (p.endsWith(".html"))
    ids.set(p, new Set([...String(data).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
for (const [p, data] of outputs) {
  if (!p.endsWith(".html")) continue;
  const s = String(data);
  if (!/<title>[^<]+<\/title>/.test(s)) errors.push(`${p}: no title`);
  for (const m of s.matchAll(/(?:href|src)="([^"]*)"/g)) {
    const u = m[1];
    if (/^(https?:|mailto:|tel:|data:|javascript:)/.test(u) || u === "") continue;
    const [path, hash] = u.split("#");
    const target = path === "" ? p : posix.normalize(posix.join(posix.dirname(p), path));
    if (!outputs.has(target)) errors.push(`${p}: link to missing ${u}`);
    else if (
      hash !== undefined &&
      hash !== "" &&
      target.endsWith(".html") &&
      !ids.get(target)?.has(decodeURIComponent(hash))
    )
      errors.push(`${p}: missing anchor ${u}`);
  }
}
for (const [code] of codes)
  if (!outputs.has(`diagnostics/${code}.html`)) errors.push(`no page for ${code}`);
if (check) rmSync(outDir, { recursive: true, force: true });
if (errors.length > 0) {
  console.error([...new Set(errors)].slice(0, 60).join("\n"));
  console.error(`${new Set(errors).size} problem(s)`);
  process.exit(1);
}
console.log(
  `${check ? "checked" : `built ${relative(root, outDir)}:`} ${pages.length} pages + ${codes.length} diagnostic pages + playground, ${index.length} search entries, 0 problem(s)`,
);
