import { readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { parseInline, printInline, type InlineIssue, type InlineNode } from "../src/index.js";

interface Fixture {
  id: string;
  input: string;
  expect: { inline: InlineNode[]; issues: string[] };
}
const fixtures = JSON.parse(
  readFileSync(new URL("../../spec/conformance/v2/inline.json", import.meta.url), "utf8"),
) as Fixture[];

describe("inline v2 conformance", () => {
  it("has at least 60 fixtures", () => expect(fixtures.length).toBeGreaterThanOrEqual(60));
  it.each(fixtures.map((f) => [f.id, f] as const))("%s", (_id, f) => {
    const issues: InlineIssue[] = [];
    expect(parseInline(f.input, { v2: true, issues })).toEqual(f.expect.inline);
    expect(issues.map((i) => i.code)).toEqual(f.expect.issues);
  });
  it("v1 mode ignores every v2 construct", () => {
    const issues: InlineIssue[] = [];
    const nodes = parseInline("[ SLIDER: 0..100 ] {{ x }} [[ USE: a ]] [ Go ]{: #a }", { issues });
    expect(issues).toEqual([]);
    expect(nodes.some((n) => n.kind === "widget" || n.kind === "binding" || n.kind === "use")).toBe(
      false,
    );
  });
});

const PIECES = [
  "[",
  "]",
  "[[",
  "]]",
  "{",
  "}",
  "{:",
  "{{",
  "}}",
  " ",
  "x",
  "a.b",
  "#id",
  ".cls",
  "key=val",
  "\\",
  "*",
  "`",
  "|",
  "USE:",
  "SLIDER:",
  "PROGRESS:",
  "0..9",
  "50%",
  '"q"',
  "[ ",
  " ]",
  "(",
  ")",
  "text:",
  "IMG:",
  "[x] ",
  "[v] ",
];
const soup = fc
  .array(fc.oneof(fc.constantFrom(...PIECES), fc.string({ maxLength: 3 })), { maxLength: 22 })
  .map((a) => a.join(""));

describe("inline v2 properties", () => {
  it("never throws on 100k random strings", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 60 }), (str) =>
        Array.isArray(parseInline(str, { v2: true })),
      ),
      { numRuns: 100_000 },
    );
  });
  it("print is stable: parse(print(parse(s))) deep-equals parse(s)", () => {
    fc.assert(
      fc.property(soup, (str) => {
        const a = parseInline(str, { v2: true });
        expect(parseInline(printInline(a), { v2: true })).toEqual(a);
      }),
      { numRuns: 50_000 },
    );
  });
});

describe('attribute values and quotes (regression: fast-check counterexample `[v] [{:key=val"}`)', () => {
  it("a double quote inside a value is rejected, so print/parse stays stable", () => {
    const issues: { code: string }[] = [];
    const nodes = parseInline('[v] [{:key=val"}', { v2: true, issues });
    expect(issues.map((i) => i.code)).toContain("E1301");
    const again = parseInline(printInline(nodes), { v2: true });
    expect(again).toEqual(nodes);
    const quoted = parseInline('[ A ](#a){: label="x"y" }', { v2: true, issues: [] });
    expect(parseInline(printInline(quoted), { v2: true })).toEqual(quoted);
  });
});
