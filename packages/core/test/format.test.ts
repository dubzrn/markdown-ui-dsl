import { readFileSync, readdirSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { equivalent, format, parse } from "../src/index.js";

const golden = new URL("./golden/fmt/", import.meta.url);

describe("formatter golden files (T-034)", () => {
  for (const f of readdirSync(golden).filter((x) => x.endsWith(".in.md"))) {
    it(f, () => {
      const input = readFileSync(new URL(f, golden), "utf8");
      const expected = readFileSync(new URL(f.replace(".in.md", ".out.md"), golden), "utf8");
      expect(format(input).text).toBe(expected);
    });
  }
});

interface Fixture {
  id: string;
  input: string;
}
const conf = new URL("../../spec/conformance/", import.meta.url);
const corpus: [string, string][] = [];
for (const f of [
  "v1/valid.json",
  "v1/invalid.json",
  "v2/valid.json",
  "v2/invalid.json",
  "v2/block-valid.json",
  "v2/block-invalid.json",
  "v2/semantic.json",
])
  for (const x of JSON.parse(readFileSync(new URL(f, conf), "utf8")) as Fixture[])
    corpus.push([`${f}:${x.id}`, x.input]);
for (const f of readdirSync(new URL("../../../examples/", import.meta.url)).filter((x) =>
  x.endsWith(".ui.md"),
))
  corpus.push([
    `examples/${f}`,
    readFileSync(new URL(`../../../examples/${f}`, import.meta.url), "utf8"),
  ]);

describe("formatter properties over the corpus", () => {
  it(`fmt(fmt(x)) = fmt(x) and parse(fmt(x)) ≡ parse(x) for all ${corpus.length} documents`, () => {
    const bad: string[] = [];
    for (const [id, src] of corpus) {
      const once = format(src).text;
      if (format(once).text !== once) bad.push(`${id}: not idempotent`);
      if (!equivalent(parse(once), parse(src))) bad.push(`${id}: AST changed`);
    }
    expect(bad).toEqual([]);
  });
  it("shipped examples format without falling back to source", () => {
    const dir = new URL("../../../examples/", import.meta.url);
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".ui.md"))) {
      expect(format(readFileSync(new URL(f, dir), "utf8")).fallbackLines, f).toEqual([]);
    }
  });
});

const TOKENS = [
  "||| COLUMN |||",
  "=== ROW ===",
  "::: CARD :::",
  "::: GRID cols=2 :::",
  "::: REGION r :::",
  "::: STATE default :::",
  "--- END ---",
  "--- END CARD ---",
  "---",
  "***",
  "*** T ***",
  "> hint",
  ">tight",
  "> @sm a: b",
  "> @dark a:b",
  "<!--",
  "-->",
  "```",
  "| A | B |",
  "| - | - |",
  "| :-: | --: |",
  "| 1 |",
  "|[ A ]|B|",
  "- item",
  "  - nested",
  "1. one",
  "# H",
  "#h",
  "[ text: x ]",
  "[ Go ](#a){: .c #b }",
  "[ SLIDER: 0..9 ]",
  "{{ a.b }}",
  "[[ USE: ./a.md ]]",
  "(( X ))",
  "[x] c",
  "[v] d {a, b}",
  "text *em* **strong**",
  "a\\*b",
  "",
  "  ",
  "\t",
];
const docs = fc
  .tuple(
    fc.constantFrom("", "---\ndsl: 2.0\n---\n", "---\ndsl: 1.0\n---\n"),
    fc.array(fc.oneof(fc.constantFrom(...TOKENS), fc.string({ maxLength: 10 })), { maxLength: 24 }),
  )
  .map(([fm, ls]) => fm + ls.join("\n"));

describe("formatter properties over generated documents", () => {
  it("never throws, is idempotent and preserves the AST (20k documents)", () => {
    fc.assert(
      fc.property(docs, (src) => {
        const once = format(src).text;
        expect(format(once).text).toBe(once);
        expect(equivalent(parse(once), parse(src))).toBe(true);
      }),
      { numRuns: 20_000 },
    );
  });
});
