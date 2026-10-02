import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { outline, parse } from "../src/index.js";

const TOKENS = [
  "||| COLUMN |||",
  "=== ROW ===",
  "::: CARD :::",
  "::: MODAL :::",
  "::: BUBBLE USER :::",
  "--- END ---",
  "---",
  "***",
  "> hint",
  "> @sm a: b",
  "> @xs a",
  "<!--",
  "-->",
  "```",
  "```yaml",
  "| A | B |",
  "| - | - |",
  "| 1 |",
  "|[ A ]| B |",
  "- item",
  "  - nested",
  "1. one",
  "* star",
  "# H",
  "[ text: x ]",
  "[ Go ](#a)",
  "",
  "  ",
  "\r",
  "\\",
  "|",
  "\u0000",
  "é😀",
];

const lines = fc.array(fc.oneof(fc.constantFrom(...TOKENS), fc.string({ maxLength: 12 })), {
  maxLength: 30,
});

describe("parser robustness (T-015)", () => {
  it("never throws on 100k random strings and always returns a tree", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 80 }), (s) => {
        const d = parse(s);
        expect(Array.isArray(d.body)).toBe(true);
      }),
      { numRuns: 100_000 },
    );
  });
  it("never throws on 50k structured line soups; spans are in range and sorted diagnostics", () => {
    fc.assert(
      fc.property(lines, (ls) => {
        const src = ls.join("\n");
        const d = parse(src);
        outline(d);
        let last = -1;
        for (const x of d.diagnostics) {
          expect(x.span.start.offset).toBeGreaterThanOrEqual(last);
          expect(x.span.start.offset).toBeLessThanOrEqual(src.length);
          last = x.span.start.offset;
        }
      }),
      { numRuns: 50_000 },
    );
  });
  it("is deterministic", () => {
    fc.assert(
      fc.property(lines, (ls) => outline(parse(ls.join("\n"))) === outline(parse(ls.join("\n")))),
      { numRuns: 2_000 },
    );
  });
});
