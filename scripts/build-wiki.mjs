#!/usr/bin/env node
// Builds the GitHub Wiki from docs/ into wiki-out/ (a ready-to-push checkout of `<repo>.wiki.git`).
//
// Rules taken from GitHub's "Documenting your project with wikis" docs:
//   - the file name is the page title; the extension picks the renderer (.md = Markdown); no `\ / : * ? " < > |` in names
//   - `_Sidebar.md` and `_Footer.md` populate the sidebar and footer
//   - wikis display PNG, JPEG and GIF images, so every SVG (examples, ```mdui fences) is rasterised to PNG
//   - links between pages use the page name ([text](Page-Name)); soft limit of 5,000 files
// Usage: node scripts/build-wiki.mjs [--out wiki-out] [--check]   (needs `pnpm build` and a Chrome/Chromium)
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, posix, dirname, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "../packages/core/dist/index.js";
import { embedMarkdown, renderSvg } from "../packages/embed/dist/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const outArg = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "wiki-out";
if (outArg === undefined || outArg.startsWith("--")) {
  console.error("wiki: --out needs a directory");
  process.exit(2);
}
const outDir = resolve(root, outArg);
/** The output directory is wiped on every build, so it must be a dedicated child of the repository that this script created. */
const OUT_MARKER = ".mdui-wiki-out";
function assertSafeOutDir() {
  const rel = relative(root, outDir);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel))
    throw new Error(`--out must be a directory inside the repository, not ${outDir}`);
  if (existsSync(outDir)) {
    if (lstatSync(outDir).isSymbolicLink() || !lstatSync(outDir).isDirectory())
      throw new Error(`--out ${outDir} is a symlink or not a directory`);
    if (readdirSync(outDir).length > 0 && !existsSync(join(outDir, OUT_MARKER)))
      throw new Error(
        `--out ${outDir} is not empty and was not created by this script (no ${OUT_MARKER}); refusing to delete it`,
      );
  }
}
const checkOnly = argv.includes("--check");
const REPO = process.env.GITHUB_REPOSITORY ?? "dubzrn/markdown-ui-dsl";
const BRANCH = process.env.WIKI_SOURCE_BRANCH ?? "main";
const BLOB = `https://github.com/${REPO}/blob/${BRANCH}/`;
const TREE = `https://github.com/${REPO}/tree/${BRANCH}/`;

/** [source file, wiki page name, sidebar section] */
const PAGES = [
  ["docs/guides/getting-started.md", "Getting-Started", "Start here"],
  ["docs/guides/novel-features.md", "Novel-Features", "Start here"],
  ["docs/SPEC.md", "Specification", "Language"],
  ["docs/GRAMMAR.md", "Grammar", "Language"],
  ["docs/LINT_RULES.md", "Lint-Rules", "Language"],
  ["docs/CONSTRAINTS.md", "Constraints", "Language"],
  ["docs/CONFORMANCE.md", "Conformance", "Language"],
  ["docs/EMBED.md", "Embedding-Wireframes", "Tools"],
  ["docs/EXPORT.md", "Exporters", "Tools"],
  ["docs/MCP.md", "MCP-Server", "Tools"],
  ["docs/SYNC.md", "Sync", "Tools"],
  ["docs/ORACLE.md", "Oracle", "Tools"],
  ["docs/SDD_INTEROP.md", "Spec-Driven-Development", "Tools"],
  ["docs/EVALS.md", "Evals", "Quality"],
  ["docs/SECURITY_REVIEW.md", "Security-Review", "Quality"],
  ["docs/GA_CHECKLIST.md", "GA-Checklist", "Quality"],
  ["docs/RELEASING.md", "Releasing", "Project"],
  ["docs/MIGRATION.md", "Migration", "Project"],
  ["docs/PLAN.md", "Plan", "Project"],
  ["docs/COMPETITIVE_RESEARCH.md", "Competitive-Research", "Project"],
  ["docs/FEATURE_ADDITIONS.md", "Feature-Register", "Project"],
  ["CONTRIBUTING.md", "Contributing", "Project"],
];
const GENERATED = [
  ["Gallery", "Language"],
  ["Architecture", "Start here"],
];
const pageOfSource = new Map(PAGES.map(([src, name]) => [src, name]));
const pageNames = new Set(["Home", ...PAGES.map((p) => p[1]), ...GENERATED.map((p) => p[0])]);

const forbidden = /[\\/:*?"<>|]/;
const errors = [];
const png = new Map(); // wiki path → svg text
const binary = new Map(); // wiki path → repo path of an image that is already PNG/JPEG/GIF

/** Name of the PNG for an SVG; stable so unrelated edits do not rename images. */
const pngPath = (svgPath) => `images/${posix.basename(svgPath).replace(/\.svg$/, ".png")}`;

function rewriteLinks(md, srcFile) {
  const srcDir = posix.dirname(srcFile);
  const fixTarget = (target, isImage) => {
    if (/^([a-z][a-z0-9+.-]*:|#|mailto:)/i.test(target)) return target;
    const [pathPart, ...rest] = target.split("#");
    const anchor = rest.length ? `#${rest.join("#")}` : "";
    const resolved = posix.normalize(posix.join(srcDir, pathPart));
    if (isImage || pathPart.endsWith(".svg")) {
      if (/^(docs\/)?img\//.test(resolved) && pathPart.endsWith(".svg")) {
        const full = join(root, resolved);
        if (existsSync(full)) {
          const p = pngPath(resolved);
          png.set(p, readFileSync(full, "utf8"));
          return p;
        }
      }
      if (/^images\//.test(pathPart)) return pathPart; // already produced by embedMarkdown
      return `${BLOB}${resolved}?raw=true`;
    }
    const page = pageOfSource.get(resolved);
    if (page !== undefined) return `${page}${anchor}`;
    const abs = join(root, resolved);
    if (resolved === "README.md") return "Home";
    if (existsSync(abs)) {
      const isDir = readdirSyncSafe(abs);
      return `${isDir ? TREE : BLOB}${resolved}${anchor}`;
    }
    errors.push(`${srcFile}: link target not found in repo: ${target}`);
    return target;
  };
  return prose(md, (t) =>
    t
      .replace(
        /(!?)\[([^\]]*)\]\(([^)\s]+)((?:\s+"[^"]*")?)\)/g,
        (m, bang, text, target, title) => {
          return `${bang}[${text}](${fixTarget(target, bang === "!")}${title})`;
        },
      )
      .replace(
        /<img([^>]*?)src="([^"]+)"/g,
        (m, pre, src) => `<img${pre}src="${fixTarget(src, true)}"`,
      ),
  );
}
/** Applies `fn` to prose only: fenced code blocks and inline code spans are left untouched. */
function outsideCode(md, fn) {
  const out = [];
  let prose = [];
  let fence = null;
  const flush = () => {
    out.push(fn(prose.join("\n")));
    prose = [];
  };
  for (const line of md.split("\n")) {
    const m = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (fence === null && m) {
      flush();
      fence = m[1];
      out.push(line);
    } else if (fence !== null) {
      out.push(line);
      if (new RegExp(`^\\s{0,3}${fence[0]}{${fence.length},}\\s*$`).test(line)) fence = null;
    } else prose.push(line);
  }
  flush();
  return out.join("\n");
}
/** Same, but also masks inline `code` so link text containing code survives intact. */
const prose = (md, fn) =>
  outsideCode(md, (t) => {
    const spans = [];
    const masked = t.replace(
      /(?<!`)(`+)(?!`)[^\n]*?(?<!`)\1(?!`)/g,
      (m) => `\uE000${spans.push(m) - 1}\uE000`,
    );
    return fn(masked).replace(/\uE000(\d+)\uE000/g, (_, i) => spans[Number(i)]);
  });

function readdirSyncSafe(p) {
  try {
    readdirSync(p);
    return true;
  } catch {
    return false;
  }
}

/** The wiki has no `[[toc]]`; drop a leading "Table of contents" list only if the source marks one with <!-- toc --> (none today). */
function convert(srcFile) {
  let md = readFileSync(join(root, srcFile), "utf8");
  const emb = embedMarkdown(md, {
    dir: "images",
    keepSource: true,
    defaults: { style: "clean", theme: "light" },
  });
  for (const w of emb.warnings) errors.push(`${srcFile}: ${w}`);
  md = emb.markdown;
  for (const [p, svg] of Object.entries(emb.files)) png.set(p.replace(/\.svg$/, ".png"), svg);
  md = md.replace(/!\[([^\]]*)\]\((images\/[^)]+)\.svg\)/g, "![$1]($2.png)");
  md = rewriteLinks(md, srcFile);
  const edit = `${BLOB}${srcFile}`;
  return `${md.trimEnd()}\n\n---\n<sub>Generated from [\`${srcFile}\`](${edit}) by \`scripts/build-wiki.mjs\`. Edit that file in the repository, not this page: the next deploy overwrites it.</sub>\n`;
}

function gallery() {
  const ex = readdirSync(join(root, "examples"))
    .filter((f) => f.endsWith(".ui.md"))
    .sort();
  const lines = [
    "# Gallery",
    "",
    "Every example in [`examples/`](" +
      TREE +
      "examples) drawn by `mdui svg` in the three built-in styles. Source and rendered output are generated from the same files, so they cannot drift.",
    "",
  ];
  for (const f of ex) {
    const base = f.replace(/\.ui\.md$/, "");
    const src = readFileSync(join(root, "examples", f), "utf8");
    const doc = parse(src);
    lines.push(`## ${base}`, "");
    for (const style of ["clean", "wireframe", "sketch"]) {
      const svg = renderSvg(doc, { style, theme: "light" });
      const p = `images/gallery-${base}-${style}.png`;
      png.set(p, svg);
      lines.push(`**${style}**`, "", `![${base}, ${style} style](${p})`, "");
    }
    lines.push(
      `<details><summary>Source: <code>examples/${f}</code></summary>`,
      "",
      "```markdown",
      src.trimEnd(),
      "```",
      "",
      "</details>",
      "",
    );
  }
  return lines.join("\n");
}

function architecture() {
  const boxes = [
    ["lint", "rules E/W/I"],
    ["render", "HTML + a11y"],
    ["embed", "SVG wireframes"],
    ["export", "A2UI · json-render"],
    ["sync", "SDD ⇄ .ui.md"],
    ["mcp / cli", "mdui · mdui-mcp"],
  ];
  const w = 1000;
  const row = (y, items, x0 = 40) =>
    items
      .map(([n, d], i) => {
        const x = x0 + i * 155;
        return `<rect x="${x}" y="${y}" width="140" height="64" rx="8" fill="#eef3ff" stroke="#3b5bdb"/><text x="${x + 70}" y="${y + 28}" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="#1b2559">${n}</text><text x="${x + 70}" y="${y + 48}" text-anchor="middle" font-family="sans-serif" font-size="10.5" fill="#364fc7">${d}</text>`;
      })
      .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="330" viewBox="0 0 ${w} 330" role="img" aria-label="Package architecture: a .ui.md file is parsed by core and consumed by lint, render, embed, export, sync, and the CLI and MCP server">
<rect width="${w}" height="330" fill="#ffffff"/>
<text x="40" y="36" font-family="sans-serif" font-size="20" font-weight="700" fill="#1b2559">markdown-ui-dsl — how the packages fit together</text>
<rect x="40" y="62" width="200" height="56" rx="8" fill="#fff4e6" stroke="#e8590c"/><text x="140" y="95" text-anchor="middle" font-family="sans-serif" font-size="15" fill="#7c2d12">screen.ui.md</text>
<path d="M240 90 H300" stroke="#495057" stroke-width="2" marker-end="url(#a)"/>
<defs><marker id="a" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0 0 L10 4 L0 8 z" fill="#495057"/></marker></defs>
<rect x="300" y="62" width="200" height="56" rx="8" fill="#d3f9d8" stroke="#2b8a3e"/><text x="400" y="86" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="#1b4332">@vrillabs/mdui-core</text><text x="400" y="104" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#2b8a3e">parse → typed AST + diagnostics</text>
<path d="M400 118 V150 M110 150 H885 M110 150 V176 M265 150 V176 M420 150 V176 M575 150 V176 M730 150 V176 M885 150 V176" stroke="#495057" stroke-width="2" fill="none"/>
${row(176, boxes, 40)}
<text x="40" y="290" font-family="sans-serif" font-size="13" fill="#495057">All packages are published as @vrillabs/mdui-* · the link-scheme policy lives in core and is shared by lint, render and the exporters.</text>
</svg>`;
  png.set("images/architecture.png", svg);
  return [
    "# Architecture",
    "",
    "![Package architecture](images/architecture.png)",
    "",
    "| Package | Role |",
    "|---|---|",
    ...[
      [
        "core",
        "Parser, AST, diagnostics, attribute/frontmatter parsing, shared link-scheme policy",
      ],
      ["spec", "JSON Schema for the AST, conformance corpus and runners"],
      ["catalog", "Component catalogs and design-system tokens"],
      ["lint", "Rules E/W/I with fixes and a SARIF/JSON reporter"],
      ["render", "Accessible HTML renderer"],
      ["tools", "Include/data resolution, state expansion, helpers shared by CLI and MCP"],
      ["tokens", "Design-token resolution"],
      ["grammar", "TextMate/Tree-sitter grammar and parity checker"],
      ["sync", "Spec-driven-development round-tripping (`--confirm` required to write)"],
      ["oracle", "Browser-based checks against rendered output"],
      ["export", "A2UI v1.0 and json-render exporters with explicit warnings"],
      ["embed", "Self-contained SVG renderer, `mdui` fences, markdown-it/remark/rehype adapters"],
      ["mcp", "Model Context Protocol server (`mdui-mcp`, 14 tools)"],
      ["cli", "`mdui` command line"],
    ].map(([n, d]) => `| [\`@vrillabs/mdui-${n}\`](${TREE}packages/${n}) | ${d} |`),
    "",
  ].join("\n");
}

function home() {
  const sections = new Map();
  for (const [src, name, sec] of PAGES) {
    if (!sections.has(sec)) sections.set(sec, []);
    sections.get(sec).push(`- [${name.replace(/-/g, " ")}](${name}) — \`${src}\``);
  }
  for (const [name, sec] of GENERATED) sections.get(sec)?.push(`- [${name}](${name})`);
  return [
    "![markdown-ui-dsl wiki and documentation banner](images/banner.png)",
    "",
    "# Markdown UI DSL",
    "",
    "A human-first Markdown wireframe language for AI coding agents, plus the toolkit around it: parser, linter, HTML and SVG renderers, A2UI / json-render exporters, an MCP server and a CLI.",
    "",
    "![A login screen drawn from a .ui.md file](images/login-form-sketch.png)",
    "",
    `Repository: https://github.com/${REPO} · Packages: [@vrillabs on npm](https://www.npmjs.com/~vrillabs)`,
    "",
    ...[...sections.entries()].flatMap(([sec, items]) => [`## ${sec}`, "", ...items, ""]),
    "> This wiki is generated from the repository's `docs/` by `scripts/build-wiki.mjs` and deployed by the *Wiki* workflow. Edit the files in the repository; direct edits here are overwritten.",
    "",
  ].join("\n");
}

function sidebar() {
  const sections = new Map();
  for (const [, name, sec] of PAGES)
    (sections.get(sec) ?? sections.set(sec, []).get(sec)).push(name);
  for (const [name, sec] of GENERATED)
    (sections.get(sec) ?? sections.set(sec, []).get(sec)).push(name);
  return [
    "**[Home](Home)**",
    "",
    ...[...sections.entries()].flatMap(([sec, names]) => [
      `**${sec}**`,
      "",
      ...names.map((n) => `- [${n.replace(/-/g, " ")}](${n})`),
      "",
    ]),
  ].join("\n");
}

const footer = `*Powered by / Built upon technology developed by VRIL LABS (VLABS, LLC). Original work available at https://vril.li* · Licensed under the [VRIL LABS Open Source License v1.0](${BLOB}LICENSE)\n`;

// ---- assemble ----
const files = new Map();
files.set("Home.md", home());
files.set("_Sidebar.md", sidebar());
files.set("_Footer.md", footer);
for (const [src, name] of PAGES) files.set(`${name}.md`, convert(src));
files.set("Gallery.md", gallery());
files.set("Architecture.md", architecture());
binary.set("images/banner.png", "docs/img/wiki-banner.png");
png.set(
  "images/login-form-sketch.png",
  readFileSync(join(root, "docs/img/login-form-sketch.svg"), "utf8"),
);

// ---- checks ----
for (const f of files.keys())
  if (forbidden.test(f.replace(/\.md$/, ""))) errors.push(`forbidden character in page name: ${f}`);
if (files.size + png.size > 5000) errors.push("wiki would exceed the 5,000-file soft limit");
const imageSet = new Set([...png.keys(), ...binary.keys()]);
const proseOf = (md) => {
  let acc = "";
  prose(md, (t) => ((acc += `${t}\n`), t));
  return acc;
};
for (const [file, md0] of files) {
  const md = proseOf(md0);
  for (const m of md.matchAll(/(!?)\[[^\]]*\]\(([^)\s]+)/g)) {
    const [, bang, target] = m;
    if (/^([a-z][a-z0-9+.-]*:|#)/i.test(target)) continue;
    const [p, anchor] = target.split("#");
    if (bang === "!") {
      if (!imageSet.has(p)) errors.push(`${file}: image not produced: ${p}`);
      else if (!/\.(png|jpe?g|gif)$/i.test(p))
        errors.push(`${file}: wikis only display PNG/JPEG/GIF: ${p}`);
    } else if (!pageNames.has(p)) errors.push(`${file}: link to unknown wiki page: ${target}`);
    else if (anchor === undefined) continue;
  }
}
// anchors: every #fragment pointing at another page must exist as a heading slug there
const slug = (h) =>
  h
    .toLowerCase()
    .replace(/<[^>]+>|[`*_~]|&[a-z]+;/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s/g, "-");
const slugsOf = (md) => new Set([...md.matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => slug(m[1])));
for (const [file, md0] of files) {
  const md = proseOf(md0);
  for (const m of md.matchAll(/(?<!!)\[[^\]]*\]\(([A-Za-z0-9-]+)#([^)\s]+)\)/g)) {
    const target = files.get(`${m[1]}.md`);
    if (target !== undefined && !slugsOf(target).has(m[2]))
      errors.push(`${file}: anchor #${m[2]} not found in ${m[1]}`);
  }
}
if (errors.length > 0) {
  console.error(`wiki: ${errors.length} problem(s)\n  ${[...new Set(errors)].join("\n  ")}`);
  process.exit(1);
}
if (checkOnly) {
  console.log(
    `wiki: ${files.size} pages, ${png.size + binary.size} images — links, anchors and image formats OK`,
  );
  process.exit(0);
}

// ---- write + rasterise ----
assertSafeOutDir();
rmSync(outDir, { recursive: true, force: true });
mkdirSync(join(outDir, "images"), { recursive: true });
writeFileSync(join(outDir, OUT_MARKER), "generated by scripts/build-wiki.mjs; safe to delete\n");
for (const [f, text] of files) writeFileSync(join(outDir, f), text);

for (const [p, src] of binary) copyFileSync(join(root, src), join(outDir, p));

const { chromium } = await import("playwright-core");
const exe = process.env.WIKI_CHROMIUM ?? process.env.CHROME_BIN;
const launch = exe
  ? { executablePath: exe }
  : existsSync("/opt/pw-browsers")
    ? { executablePath: findPw() }
    : { channel: "chrome" };
function findPw() {
  const d = readdirSync("/opt/pw-browsers").find((n) => /^chromium-\d+$/.test(n));
  return `/opt/pw-browsers/${d}/chrome-linux/chrome`;
}
const browser = await chromium.launch({ ...launch, args: ["--no-sandbox"] });
const page = await (await browser.newContext({ deviceScaleFactor: 2 })).newPage();
for (const [p, svg] of png) {
  await page.setContent(`<!doctype html><body style="margin:0;background:#fff">${svg}</body>`);
  const el = await page.$("svg");
  writeFileSync(join(outDir, p), await el.screenshot({ type: "png" }));
}
await browser.close();
console.log(`wiki: wrote ${files.size} pages and ${png.size + binary.size} images to ${outDir}`);
