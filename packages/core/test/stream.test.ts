import { readFileSync, readdirSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { StreamParser, parse, parseStream, type BlockNode, type Document } from "../src/index.js";

const norm = (d: Document): unknown => JSON.parse(JSON.stringify(d));
const nodeJson = (n: BlockNode): string => JSON.stringify(n);

/** Split `s` at the given (sorted, unique) cut points. */
function cut(s: string, cuts: number[]): string[] {
  const out: string[] = [];
  let prev = 0;
  for (const c of [...new Set(cuts)].filter((x) => x > 0 && x < s.length).sort((a, b) => a - b)) {
    out.push(s.slice(prev, c));
    prev = c;
  }
  out.push(s.slice(prev));
  return out;
}

/** Stream `chunks`, checking the invariants after every push; returns the final document. */
function streamChecked(chunks: string[], batch: Document): Document {
  const p = new StreamParser();
  const committed: BlockNode[] = [];
  for (const c of chunks) {
    const u = p.push(c);
    committed.push(...u.committed);
    // committed nodes are final: each equals the batch node at the same index (never retracted)
    u.committed.forEach((_, i) => {
      const k = committed.length - u.committed.length + i;
      expect(nodeJson(committed[k] as BlockNode)).toBe(nodeJson(batch.body[k] as BlockNode));
    });
  }
  return p.end();
}

describe("streaming parser (T-042)", () => {
  it("one chunk, char-by-char and line-by-line all equal batch (shipped examples)", () => {
    const dir = new URL("../../../examples/", import.meta.url);
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".ui.md"))) {
      const src = readFileSync(new URL(f, dir), "utf8");
      const batch = parse(src);
      expect(norm(parseStream([src])), f).toEqual(norm(batch));
      expect(norm(streamChecked([...src], batch)), `${f} char`).toEqual(norm(batch));
      expect(norm(streamChecked(src.split(/(?<=\n)/), batch)), `${f} lines`).toEqual(norm(batch));
    }
  });

  it("pathological splits: inside `{: `, `[[ USE`, `{{`, fences, comments, frontmatter, CRLF", () => {
    const docs = [
      "---\ndsl: 2.0\n---\n[ Go ](#a){: #b .c }\n[[ USE: ./x.ui.md ]]{: p=1 }\n{{ a.b }}\n",
      '---\ndsl: 2.0\n---\n::: CARD :::{: #x }\n[ text: a ]{: label="q" }\n--- END CARD ---\n',
      "```\nfence\n```\n<!-- c\nd -->\n# H\n",
      "::: CARD :::\r\nx\r\n--- END ---\r\n",
      "---\nframework: x\n---\n| A | B |\n| - | - |\n| 1 | 2 |\n\n- a\n- b\n",
      "---\nframework: x\n",
      "---\n---\n",
      "x\n---\ny\n",
    ];
    for (const src of docs) {
      const batch = parse(src);
      for (let at = 1; at < src.length; at++) {
        expect(
          norm(streamChecked(cut(src, [at]), batch)),
          `${JSON.stringify(src.slice(0, 30))} @${at}`,
        ).toEqual(norm(batch));
      }
    }
  });

  it("tail is provisional and replaced; committed grows monotonically", () => {
    const p = new StreamParser();
    const u1 = p.push("# Title\n\n::: CARD :::\nhel");
    expect(u1.committed.map((n) => n.kind)).toEqual(["heading"]);
    expect(u1.tail.map((n) => n.kind)).toEqual(["card"]);
    const u2 = p.push("lo\n--- END ---\n\n[ Go ](#a)\n");
    expect(u2.committed.map((n) => n.kind)).toEqual(["card"]);
    expect(p.end().body.map((n) => n.kind)).toEqual(["heading", "card", "line"]);
  });

  it("a half-typed attribute list is provisional text, then becomes attributes", () => {
    const p = new StreamParser();
    p.push("---\ndsl: 2.0\n---\n");
    const mid = p.push("[ Go ](#a){: #b");
    const first = mid.tail[0];
    expect(first?.kind).toBe("line");
    const done = p.push(" .c }\n");
    const line = done.tail[0] ?? p.end().body[0];
    expect(JSON.stringify(line)).toContain('"attrs"');
  });

  it("frontmatter diagnostics and dsl version are available once its fence closes", () => {
    const p = new StreamParser();
    p.push("---\ncolour: red\n");
    expect(p.push("---\nx\n").diagnostics.map((d) => d.code)).toEqual(["W1204"]);
    expect(p.end().dsl).toBe("1");
  });
});

const TOKENS = [
  "||| COLUMN |||",
  "::: CARD :::{: #a }",
  "::: GRID cols=2 :::",
  "--- END ---",
  "--- END CARD ---",
  "---",
  "***",
  "> hint",
  "> @dark a: b",
  "<!--",
  "-->",
  "```",
  "| A | B |",
  "| - | - |",
  "| 1 | 2 |",
  "|[ A ]| B |",
  "- item",
  "  - nested",
  "1. one",
  "# H",
  "[ text: x ]{: #b }",
  "[ Go ](#a)",
  "[ SLIDER: 0..9 ]",
  "{{ a.b }}",
  "[[ USE: ./a.md ]]",
  "(( X ))",
  "[x] c",
  "",
  "  ",
  "text *em*",
];
const docs = fc
  .tuple(
    fc.constantFrom(
      "",
      "---\ndsl: 2.0\n---\n",
      "---\ndsl: 1.0\nlang: en\n---\n",
      "---\nunterminated\n",
    ),
    fc.array(fc.oneof(fc.constantFrom(...TOKENS), fc.string({ maxLength: 8 })), { maxLength: 22 }),
    fc.constantFrom("\n", "\r\n"),
  )
  .map(([fm, ls, nl]) => (fm + ls.join("\n")).replace(/\n/g, nl) + (ls.length % 2 === 0 ? nl : ""));

describe("streaming equals batch", () => {
  it("for 12k random documents under random chunkings (and committed nodes never retract)", () => {
    fc.assert(
      fc.property(docs, fc.array(fc.nat({ max: 400 }), { maxLength: 12 }), (src, cuts) => {
        const batch = parse(src);
        expect(norm(streamChecked(cut(src, cuts), batch))).toEqual(norm(batch));
      }),
      { numRuns: 12_000 },
    );
  });
});
