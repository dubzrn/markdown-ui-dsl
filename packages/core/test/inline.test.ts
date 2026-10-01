import { readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { parseInline, printInline, type InlineNode } from "../src/index.js";

interface Fixture {
  id: string;
  input: string;
  expect: { inline: InlineNode[] };
}
const fixtures = JSON.parse(
  readFileSync(new URL("../../spec/conformance/v1/inline.json", import.meta.url), "utf8"),
) as Fixture[];

describe("inline conformance v1", () => {
  it("has at least 60 fixtures with unique ids", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(60);
    expect(new Set(fixtures.map((f) => f.id)).size).toBe(fixtures.length);
  });
  it.each(fixtures.map((f) => [f.id, f] as const))("%s", (_id, f) => {
    expect(parseInline(f.input)).toEqual(f.expect.inline);
  });
});

const PIECES = [
  "[",
  "]",
  "(",
  ")",
  "((",
  "))",
  "{",
  "}",
  "\\",
  "*",
  "**",
  "_",
  "`",
  "|",
  "x",
  " ",
  "text:",
  "IMG:",
  "[ ]",
  "[x] ",
  "[v] ",
  "{a, b}",
  "#a",
  ": ",
];
const soup = fc
  .array(fc.oneof(fc.constantFrom(...PIECES), fc.string({ maxLength: 4 })), { maxLength: 24 })
  .map((a) => a.join(""));

describe("inline properties", () => {
  it("never throws on 100k random strings", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 60 }), (s) => Array.isArray(parseInline(s))),
      { numRuns: 100_000 },
    );
  });
  it("print is stable: parse(print(parse(s))) deep-equals parse(s)", () => {
    fc.assert(
      fc.property(soup, (s) => {
        const a = parseInline(s);
        expect(parseInline(printInline(a))).toEqual(a);
      }),
      { numRuns: 50_000 },
    );
  });
});
