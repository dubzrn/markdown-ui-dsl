import { readFileSync, readdirSync } from "node:fs";
import { analyze, parse } from "@mdui/core";
import { describe, expect, it } from "vitest";
import { render, safeUrl } from "../src/index.js";

const frag = (src: string, opts = {}) =>
  render(parse(src), { fragment: true, style: "none", ...opts });
const v2 = (body: string, fm = "") => `---\ndsl: 2.0\n${fm}---\n${body}`;

describe("semantic mapping (T-040a)", () => {
  it("containers and landmarks", () => {
    expect(frag("::: HEADER :::\nx\n--- END ---\n")).toContain("<header");
    expect(frag("::: FOOTER :::\nx\n--- END ---\n")).toContain("<footer");
    expect(frag("::: MODAL :::\nx\n--- END ---\n")).toMatch(
      /<dialog open [^>]*role="dialog" aria-modal="true"/,
    );
    expect(frag("::: CARD :::\nx\n--- END ---\n")).toContain("<section");
    expect(frag("||| COLUMN |||\n--- END ---\n")).toContain("mdui-col");
    expect(frag("=== ROW ===\n--- END ---\n")).toContain("mdui-row");
    expect(frag("::: BUBBLE USER :::\nhi\n--- END ---\n")).toContain('aria-label="User message"');
    expect(frag("::: BUBBLE AGENT :::\nhi\n--- END ---\n")).toContain('aria-label="Agent message"');
  });
  it("headings keep their level; lines are paragraphs; hr for dividers", () => {
    expect(frag("# A\n### B\ntext\n***\n")).toBe(
      '<main class="mdui mdui-style-none" data-theme="auto">\n<h1>A</h1>\n<h3>B</h3>\n<p>text</p>\n<hr>\n</main>',
    );
  });
  it("lists and tables", () => {
    expect(frag("- a\n- b\n")).toContain("<ul>");
    expect(frag("1. a\n2. b\n")).toContain("<ol>");
    const t = frag("| A | B |\n| :-- | --: |\n| 1 | 2 |\n");
    expect(t).toContain('<th scope="col" data-align="left">');
    expect(t).toContain('<td data-align="right">2</td>');
  });
  it("tabs use tablist/tab/aria-selected", () => {
    const t = frag("|[ A ]| B |\n");
    expect(t).toContain('role="tablist"');
    expect(t).toContain('aria-selected="true"');
    expect(t).toContain('aria-selected="false"');
  });
  it("inline widgets", () => {
    const h = frag(
      "[ Go ](#go)\n[ text: Email ]\n[x] Yes\n( ) No\n[on] Wifi\n[v] Role {A, B}\n(( Pro ))\n[ IMG: Logo ]\n",
    );
    expect(h).toContain('<button type="button" data-action="go">Go</button>');
    expect(h).toContain('<input type="text" placeholder="Email" aria-label="Email">');
    expect(h).toContain('<input type="checkbox" checked>');
    expect(h).toContain('<input type="radio">');
    expect(h).toContain('role="switch" aria-checked="true"');
    expect(h).toContain('<select aria-label="Role">');
    expect(h).toContain('<span class="mdui-badge">Pro</span>');
    expect(h).toContain('role="img" aria-label="Logo"');
  });
  it("2.0 attributes map to ARIA and form attributes", () => {
    const h = frag(
      v2(
        '[ text: Email ]{: #email type=email required label="Email address" }\n[ Delete ](#d){: destructive }\n',
      ),
    );
    expect(h).toContain('id="email"');
    expect(h).toContain('type="email"');
    expect(h).toContain("required");
    expect(h).toContain('aria-required="true"');
    expect(h).toContain('aria-label="Email address"');
    expect(h).toContain("data-destructive");
  });
  it("2.0 primitives", () => {
    const h = frag(
      v2(
        '[ SLIDER: 0..100 step=5 value=40 ]\n[ PROGRESS: 75% ]\n[ PAGER: 3/10 ]\n[ CRUMBS: Home > *Here* ]\n[ STEPPER: A > *B* > C ]\n[ MENUBAR: File | Edit ]\n[ STAT: "Users" 1,204 ]\n[ SKELETON: rows=2 ]\n[ CHART: bar "Rev" data=rev ]\n[ DATE: 2026-03-15 ]\n[ FILE: Upload CV ]\n[ ICON: bell ]\n[ AVATAR: Jane Doe ]\n',
      ),
    );
    expect(h).toContain('<input type="range" min="0" max="100" step="5" value="40"');
    expect(h).toContain('<progress value="75" max="100"');
    expect(h).toContain('aria-label="Pagination"');
    expect(h).toContain('aria-current="page"');
    expect(h).toContain('aria-current="step"');
    expect(h).toContain('role="menubar"');
    expect(h).toContain("<dt>Users</dt>");
    expect(h).toContain('aria-label="Loading"');
    expect(h).toContain('aria-label="bar chart: Rev"');
    expect(h).toContain('<input type="date" value="2026-03-15"');
    expect(h).toContain('<input type="file"');
    expect(h).toContain('aria-hidden="true" data-icon="bell"');
  });
  it("named containers", () => {
    const h = frag(
      v2(
        '::: GRID cols=3 :::\nx\n--- END ---\n::: PANEL "More" open :::\ny\n--- END ---\n::: GROUP "Box" :::\nz\n--- END ---\n::: CALLOUT info :::\nn\n--- END ---\n',
      ),
    );
    expect(h).toContain("repeat(3,minmax(0,1fr))");
    expect(h).toContain("<details open");
    expect(h).toContain("<summary>More</summary>");
    expect(h).toContain("<legend>Box</legend>");
    expect(h).toContain('role="note"');
  });
});

describe("states (T-040c)", () => {
  const src = v2(
    "::: REGION users :::\n::: STATE default :::\nTable\n--- END ---\n::: STATE loading :::\n[ SKELETON: rows=2 ]\n--- END ---\n::: STATE empty :::\nNo users\n--- END ---\n--- END ---\n",
  );
  it("renders the default state unless another is chosen; every state renders", () => {
    expect(frag(src)).toContain("Table");
    expect(frag(src)).not.toContain("No users");
    for (const s of ["default", "loading", "empty"])
      expect(frag(src, { state: s })).toContain(`data-state="${s}"`);
    expect(frag(src, { state: "empty" })).toContain("No users");
    expect(frag(src, { state: "nope" })).toContain('data-state="default"');
  });
});

describe("responsive and environment directives (T-040c)", () => {
  it("attach to the enclosing block as data attributes", () => {
    const h = frag("=== ROW ===\n> @sm layout: stacked, gap: compact\nx\n--- END ---\n");
    expect(h).toContain('data-bp-sm-layout="stacked"');
    expect(h).toContain('data-bp-sm-gap="compact"');
    expect(frag(v2("::: CARD :::\n> @md @dark surface: inverted\n--- END ---\n"))).toContain(
      'data-bp-md-dark-surface="inverted"',
    );
  });
});

describe("document shell", () => {
  it("title, lang, dir, style and caption", () => {
    const h = render(
      parse("---\ndsl: 2.0\ntitle: Sign in\nlang: ar\ndir: rtl\ncaption: Mobile\n---\n# Hi\n"),
      { style: "sketch" },
    );
    expect(h).toContain("<title>Sign in</title>");
    expect(h).toContain('<html lang="ar" dir="rtl">');
    expect(h).toContain("mdui-style-sketch");
    expect(h).toContain("Mobile");
    expect(render(parse("# Hello"), { style: "none" })).not.toContain("<style>");
  });
  it("includes are expanded from resolved partials", () => {
    const files: Record<string, string> = {
      "nav.ui.md": "---\ndsl: 2.0\ntype: partial\n---\nNAV\n",
    };
    const main = parse(v2("[[ USE: ./nav.ui.md ]]\n"));
    const a = analyze(main, { readFile: (p) => files[p] });
    const includes = new Map(
      a.includes.flatMap((i) =>
        i.path !== undefined && i.doc !== undefined ? [[i.path, i.doc] as const] : [],
      ),
    );
    expect(render(main, { fragment: true, style: "none", includes })).toContain("NAV");
  });
});

describe("security: output is escaped and URLs are sanitised", () => {
  it("escapes text, attributes and code", () => {
    const h = frag(
      '<script>alert(1)</script> & "q"\n[ <b>x</b> ](#"onmouseover="alert(1))\n```\n</pre><script>\n```\n',
    );
    expect(h).not.toContain("<script>");
    expect(h).not.toContain("<b>");
    expect(h).toContain("&lt;script&gt;");
    expect(h).not.toMatch(/data-action="[^"]*"[^>]*onmouseover/);
  });
  it("blocks dangerous URL schemes", () => {
    for (const u of [
      "javascript:alert(1)",
      " javascript:alert(1)",
      "JaVaScRiPt:x",
      "data:text/html,<script>",
      "vbscript:x",
      "file:///etc/passwd",
    ])
      expect(safeUrl(u), u).toBe("#");
    for (const u of [
      "https://a.b/c",
      "http://x",
      "mailto:a@b.c",
      "/rel",
      "./rel",
      "#frag",
      "page.html",
    ])
      expect(safeUrl(u), u).toBe(u);
    expect(frag("[Docs](javascript:alert(1))\n")).toContain('href="#"');
  });
  it("attribute values cannot break out", () => {
    const h = frag(v2('[ Go ]{: label="x\\" onclick=\\"alert(1)" }\n'));
    expect(h).not.toMatch(/\sonclick=/);
    expect(h).not.toContain('alert(1)"');
    // an event-handler name is never emitted as an attribute: it is neutralised to data-attr-*
    const k = frag(v2("[ Go ]{: onclick=alert(1) }\n"));
    expect(k).not.toMatch(/\sonclick=/);
    expect(k).toContain("data-attr-onclick");
  });
  it("hints cannot close their comment", () => {
    const h = frag("> a --> <script>alert(1)</script>\n");
    expect(h).not.toContain("<script>");
    expect(h.match(/-->/g)?.length).toBe(1);
  });
});

describe("golden HTML structure for the shipped examples (styling excluded)", () => {
  const dir = new URL("../../../examples/", import.meta.url);
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".ui.md"))) {
    it(f, async () => {
      const html = render(parse(readFileSync(new URL(f, dir), "utf8")), {
        style: "none",
        fragment: true,
      });
      await expect(html).toMatchFileSnapshot(`golden/${f.replace(".ui.md", ".html")}`);
    });
  }
});

describe("safeUrl reads the scheme the way a browser does (review finding)", () => {
  for (const bad of [
    "java\tscript:alert(1)",
    "java\nscript:alert(1)",
    "jav&#x61;script:alert(1)",
    "java&Tab;script:alert(1)",
    "​javascript:alert(1)",
    "%6Aavascript:alert(1)",
    "data:text/html,x",
    "vbscript:x",
  ])
    it(`neutralises ${JSON.stringify(bad)}`, () => {
      expect(safeUrl(bad)).toBe("#");
      expect(render(parse(`[x](${bad})\n`))).not.toMatch(/href="[^"]*(java|vbs|data:)/i);
    });
  it("keeps safe targets and never throws on out-of-range entities", () => {
    expect(safeUrl("https://x.test/a")).toBe("https://x.test/a");
    expect(safeUrl("/route")).toBe("/route");
    expect(() => safeUrl("&#x110000;&#99999999999;javascript:x")).not.toThrow();
  });
});
