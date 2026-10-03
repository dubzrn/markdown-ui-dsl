import { readFileSync, readdirSync } from "node:fs";
import MarkdownIt from "markdown-it";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { describe, expect, it } from "vitest";
import { parse } from "@vrillabs/mdui-core";
import {
  embedMarkdown,
  markdownItMdui,
  parseFenceInfo,
  registerObsidianMdui,
  rehypeMdui,
  remarkMdui,
  renderFence,
  renderSvg,
} from "../src/index.js";

const H = "---\ndsl: 2.0\nlang: en\n---\n";
const examples = new URL("../../../examples/", import.meta.url);

/** Tiny well-formedness check: balanced tags, quoted attributes, no stray `&` or `<`. */
function wellFormed(xml: string): string | undefined {
  const stack: string[] = [];
  const re = /<(\/?)([A-Za-z][\w:-]*)((?:\s+[\w:-]+="[^"<]*")*)\s*(\/?)>|<!--[\s\S]*?-->|[^<]+/g;
  let m: RegExpExecArray | null;
  let last = 0;
  while ((m = re.exec(xml)) !== null) {
    if (m.index !== last) return `unparsed text at ${last}`;
    last = re.lastIndex;
    if (m[2] === undefined) {
      if (m[0].startsWith("<")) continue;
      if (/&(?!(?:amp|lt|gt|quot|#\d+);)/.test(m[0])) return `bad entity in ${m[0].slice(0, 40)}`;
      continue;
    }
    if (m[4] === "/") continue;
    if (m[1] === "/") {
      if (stack.pop() !== m[2]) return `mismatched </${m[2]}>`;
    } else stack.push(m[2]);
  }
  if (last !== xml.length) return "trailing junk";
  return stack.length === 0 ? undefined : `unclosed <${stack.pop()}>`;
}

describe("the well-formedness helper is not vacuous", () => {
  it("rejects broken XML", () => {
    for (const bad of ["<a><b></a>", "<a>", "<a>x & y</a>", "<a b=c></a>", "x<a/>y<"])
      expect(wellFormed(bad), bad).toBeDefined();
    expect(wellFormed('<a b="c"><d/>x &amp; y</a>')).toBeUndefined();
  });
});

describe("SVG renderer (T-094a)", () => {
  it("is well-formed, deterministic and accessible for every example and style", () => {
    for (const f of readdirSync(examples).filter((x) => x.endsWith(".ui.md")))
      for (const style of ["wireframe", "clean", "sketch"] as const) {
        const doc = parse(readFileSync(new URL(f, examples), "utf8"));
        const a = renderSvg(doc, { style });
        expect(wellFormed(a), `${f} ${style}`).toBeUndefined();
        expect(a, `${f} ${style}`).toBe(renderSvg(doc, { style }));
        expect(a).toMatch(/^<svg [^>]*role="img"[^>]*aria-labelledby="t d"/);
        expect(a).toContain('<title id="t">');
        expect(a).toContain('<desc id="d">');
      }
  });

  it("is self-contained: real text, no external references, no scripts, no images", () => {
    const svg = renderSvg(parse(readFileSync(new URL("login-form.ui.md", examples), "utf8")));
    expect(svg).toContain("<text");
    expect(svg).toContain("Welcome Back");
    expect(svg).not.toMatch(/<script|<image|<foreignObject|href=|url\(|@import|javascript:/i);
  });

  it("login example is within the 50 kB budget", () => {
    for (const style of ["wireframe", "clean", "sketch"] as const)
      expect(
        renderSvg(parse(readFileSync(new URL("login-form.ui.md", examples), "utf8")), { style })
          .length,
      ).toBeLessThanOrEqual(50_000);
  });

  it("escapes hostile text everywhere it can appear", () => {
    const evil = `</text><script>alert(1)</script>"&'`;
    const svg = renderSvg(
      parse(`${H}# ${evil}\n[ ${evil} ](#x)\n[ text: ${evil} ]\n|${evil}|b|\n|-|-|\n|${evil}|d|\n`),
    );
    expect(wellFormed(svg)).toBeUndefined();
    expect(svg).not.toContain("<script");
    expect(svg).toContain("&lt;script&gt;");
  });

  it("theme and style variants only change styling", () => {
    const doc = parse(`${H}# Hi\n[ Go ](#g)\n`);
    expect(renderSvg(doc, { theme: "auto" })).toContain("prefers-color-scheme:dark");
    expect(renderSvg(doc, { theme: "light" })).not.toContain("prefers-color-scheme");
    expect(renderSvg(doc, { style: "sketch" })).toContain("Segoe Print");
  });

  it("draws the chosen STATE of a REGION", () => {
    const src = `${H}::: REGION r :::\n::: STATE default :::\nAAA\n--- END ---\n::: STATE empty :::\nBBB\n--- END ---\n--- END ---\n`;
    expect(renderSvg(parse(src))).toContain("AAA");
    expect(renderSvg(parse(src))).not.toContain("BBB");
    expect(renderSvg(parse(src), { state: "empty" })).toContain("BBB");
  });

  it("never throws on empty, broken or huge input", () => {
    for (const s of ["", "::: CARD :::", "[ [ [", "x".repeat(20_000), `${H}${"- a\n".repeat(500)}`])
      expect(() => renderSvg(parse(s))).not.toThrow();
  });
});

describe("fence options", () => {
  it("parses info-string options and reports what it ignores", () => {
    const f = parseFenceInfo(
      "mdui style=sketch state=loading theme=dark width=480 output=html bogus=1 x",
    );
    expect(f.matches).toBe(true);
    expect(f.options).toEqual({
      style: "sketch",
      theme: "dark",
      state: "loading",
      width: 480,
      output: "html",
    });
    expect(f.warnings).toHaveLength(2);
    expect(parseFenceInfo("js").matches).toBe(false);
    expect(parseFenceInfo("mdui style=neon").warnings).toEqual(["ignored style=neon"]);
  });
});

describe("adapters (T-094b)", () => {
  const md =
    "# Doc\n\n```mdui style=wireframe\n::: CARD :::\n# Hi\n[ Go ](#g)\n--- END ---\n```\n\nafter\n\n```js\nlet a = 1\n```\n";
  it("markdown-it renders an mdui fence as SVG and leaves other fences alone", () => {
    const html = new MarkdownIt().use(markdownItMdui).render(md);
    expect(html).toContain("<svg");
    expect(html).toContain("Hi");
    expect(html).toContain('<code class="language-js">');
    expect(
      wellFormed(html.slice(html.indexOf("<svg"), html.indexOf("</svg>") + 6)),
    ).toBeUndefined();
  });
  it("remark renders the same through remark-rehype", async () => {
    const out = String(
      await unified()
        .use(remarkParse)
        .use(remarkMdui)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(md),
    );
    expect(out).toContain("<svg");
    expect(out).toContain('<code class="language-js">');
  });
  it("rehype handles pre>code.language-mdui", async () => {
    const out = String(
      await unified()
        .use(rehypeParse, { fragment: true })
        .use(rehypeMdui)
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(
          '<p>x</p><pre><code class="language-mdui">::: CARD :::\nHi\n--- END ---\n</code></pre>',
        ),
    );
    expect(out).toContain("<svg");
    expect(out).toContain("<p>x</p>");
  });
  it("html output carries the stylesheet and escapes content", () => {
    const h = renderFence("[ <b>x</b> ](#g)\n", "mdui output=html");
    expect(h).toContain('<div class="mdui-embed"><style>');
    expect(h).not.toContain("<b>x</b>");
  });
  it("the obsidian registration calls the processor with an SVG node (structural check only)", () => {
    let handler: ((s: string, el: { appendChild(n: unknown): unknown }) => void) | undefined;
    const parsed: string[] = [];
    (globalThis as { DOMParser?: unknown }).DOMParser = class {
      parseFromString(s: string): { documentElement: string } {
        parsed.push(s);
        return { documentElement: "NODE" };
      }
    };
    registerObsidianMdui({
      registerMarkdownCodeBlockProcessor: (lang, h) =>
        void ((handler = h), expect(lang).toBe("mdui")),
    });
    const appended: unknown[] = [];
    handler?.("Hello\n", { appendChild: (n) => appended.push(n) });
    expect(parsed[0]).toMatch(/^<svg /);
    expect(appended).toEqual(["NODE"]);
  });
});

describe("embedMarkdown (T-094c)", () => {
  const md =
    "# T\n\n```mdui style=sketch\n# Login\n[ Go ](#g)\n```\n\ntext\n\n~~~mdui\nHello\n~~~\n\n```mdui\n::: CARD :::\nunclosed";
  it("replaces fences with image embeds and returns the SVGs", () => {
    const r = embedMarkdown(md, { dir: "assets" });
    expect(r.markdown).toMatch(/!\[Login\]\(assets\/[0-9a-f]{8}\.svg\)/);
    expect(r.markdown).toMatch(/!\[Wireframe\]\(assets\/[0-9a-f]{8}\.svg\)/);
    expect(Object.keys(r.files)).toHaveLength(2);
    for (const svg of Object.values(r.files)) expect(wellFormed(svg)).toBeUndefined();
    expect(r.warnings.some((w) => w.includes("unclosed"))).toBe(true);
    expect(r.markdown).toContain("::: CARD :::\nunclosed");
  });
  it("is deterministic and file names depend only on the fence", () => {
    const a = embedMarkdown(md);
    expect(embedMarkdown(md)).toEqual(a);
    expect(Object.keys(embedMarkdown(md.replace("# T", "# Other")).files)).toEqual(
      Object.keys(a.files),
    );
  });
  it("keeps the source collapsed under the image when asked", () => {
    const r = embedMarkdown("```mdui\nHello\n```\n", { keepSource: true });
    expect(r.markdown).toContain("<details><summary>Source</summary>");
    expect(r.markdown).toContain("```mdui\nHello\n```");
  });
});
