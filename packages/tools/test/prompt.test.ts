import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadCatalog, loadMap } from "@mdui/catalog";
import { lint } from "@mdui/lint";
import { loadDesignSystem } from "@mdui/tokens";
import { AGENTS, composePrompt } from "../src/index.js";

const ex = (f: string) => readFileSync(new URL(`../../../examples/${f}`, import.meta.url), "utf8");
const H = "---\ndsl: 2.0\nlang: en\n---\n";
const plain = [{ path: "a.ui.md", source: "::: CARD :::\n[ Go ](#go)\n--- END ---\n" }];
const charts = [{ path: "c.ui.md", source: `${H}[ CHART: line, Sales, data=sales ]\n` }];

describe("prompt generator (T-054)", () => {
  it("is byte-identical across runs and independent of document order", () => {
    const docs = [
      { path: "b.ui.md", source: ex("login-form.ui.md") },
      { path: "a.ui.md", source: ex("chat-interface.ui.md") },
    ];
    const one = composePrompt({ documents: docs });
    expect(composePrompt({ documents: docs })).toBe(one);
    expect(composePrompt({ documents: [...docs].reverse() })).toBe(one);
  });

  it("a project without charts never mentions CHART, in any flavour", () => {
    for (const agent of AGENTS)
      expect(composePrompt({ documents: plain, agent })).not.toMatch(/CHART/);
    expect(composePrompt({})).not.toMatch(/CHART/);
  });

  it("mentions CHART (with its props) once a document uses it, or with --all", () => {
    expect(composePrompt({ documents: charts })).toMatch(/\[ CHART: type, title\?, data/);
    expect(composePrompt({ all: true })).toMatch(/CHART/);
  });

  it("covers only used constructs", () => {
    const p = composePrompt({ documents: plain });
    expect(p).toMatch(/CARD/);
    expect(p).not.toMatch(/MODAL|Toggle|Dropdown|BUBBLE/);
  });

  it("includes catalog components, tokens, bound data and the component map", () => {
    const catalog = loadCatalog(
      readFileSync(
        new URL("../../../examples/catalogs/shop.catalog.yaml", import.meta.url),
        "utf8",
      ),
    ).catalog;
    const map = loadMap(
      readFileSync(
        new URL("../../../examples/catalogs/shop.flutter.map.yaml", import.meta.url),
        "utf8",
      ),
    ).map;
    const ds = loadDesignSystem(
      "---\nname: Shop\ncolors:\n  primary: '#112233'\nspacing:\n  md: 16px\n---\n",
    );
    const p = composePrompt({
      documents: [{ path: "x.ui.md", source: `${H}{{ user.name }}\n` }],
      catalog,
      map,
      designSystem: ds,
    });
    expect(p).toMatch(/PRODUCTCARD/);
    expect(p).toMatch(/primary=#112233/);
    expect(p).toMatch(/`user.name`/);
    expect(p).toMatch(/RatingBar/);
  });

  it("renders per-agent flavours", () => {
    expect(composePrompt({ documents: plain, agent: "claude" })).toMatch(/^<markdown-ui-dsl>/);
    expect(composePrompt({ documents: plain, agent: "cursor" })).toMatch(/^---\ndescription:/);
    expect(composePrompt({ documents: plain, agent: "copilot" })).toMatch(/Copilot instructions/);
    expect(composePrompt({ documents: plain })).toMatch(/^# Markdown-UI DSL\n/);
  });

  it("its examples are lint-clean DSL", () => {
    const p = composePrompt({ all: true });
    const blocks = [...p.matchAll(/```markdown\n([\s\S]*?)\n```/g)].map((m) => m[1] as string);
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) expect(lint(`${b}\n`).diagnostics, b).toEqual([]);
  });

  it("states the trust model", () => {
    expect(composePrompt({})).toMatch(/is data/);
  });
});
