import { readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { dslVersion, parseFrontmatter, type FrontmatterData } from "../src/frontmatter.js";

interface Fixture {
  id: string;
  input: string;
  expect: { data: FrontmatterData; issues: { code: string; line: number }[] };
}
const fixtures = JSON.parse(
  readFileSync(new URL("../../spec/conformance/v1/frontmatter.json", import.meta.url), "utf8"),
) as Fixture[];

describe("frontmatter conformance", () => {
  it("has at least 30 fixtures with unique ids", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(30);
    expect(new Set(fixtures.map((f) => f.id)).size).toBe(fixtures.length);
  });
  it.each(fixtures.map((f) => [f.id, f] as const))("%s", (_id, f) => {
    const r = parseFrontmatter(f.input);
    expect(r.issues.map((i) => ({ code: i.code, line: i.line }))).toEqual(f.expect.issues);
    expect(r.data).toEqual(f.expect.data);
  });
});

describe("dslVersion", () => {
  it("absent ⇒ 1, 2.0 ⇒ 2.0, 1.x ⇒ 1", () => {
    expect(dslVersion({})).toBe("1");
    expect(dslVersion({ dsl: "2.0" })).toBe("2.0");
    expect(dslVersion({ dsl: "1.2" })).toBe("1");
  });
});

describe("frontmatter robustness", () => {
  it("never throws on 100k random strings", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 80 }), (s) => typeof parseFrontmatter(s) === "object"),
      { numRuns: 100_000 },
    );
  });
  it("never throws on structured YAML-ish soup", () => {
    const piece = fc.constantFrom(
      "a: b",
      "- x",
      "  c: d",
      "k:",
      "[1, 2]",
      "{ a: 1 }",
      '"q',
      "'q",
      "&a",
      "*a",
      "|",
      ">",
      "# c",
      "\t",
      "---",
      "<<: x",
      "",
    );
    fc.assert(
      fc.property(
        fc.array(piece, { maxLength: 12 }),
        (a) => typeof parseFrontmatter(a.join("\n")) === "object",
      ),
      { numRuns: 50_000 },
    );
  });
});
