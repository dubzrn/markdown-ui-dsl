import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "../src/index.js";

/** T-024: every v1 document must parse to an equal AST (modulo spans) with and without `dsl: 2.0`,
 * unless it contains text whose meaning RFC-0001 §6 explicitly changes under 2.0. */
interface Fixture {
  id: string;
  input: string;
}
const dir = new URL("../../spec/conformance/v1/", import.meta.url);
const fixtures: Fixture[] = [
  ...(JSON.parse(readFileSync(new URL("valid.json", dir), "utf8")) as Fixture[]),
  ...(JSON.parse(readFileSync(new URL("invalid.json", dir), "utf8")) as Fixture[]),
];
const examples = readdirSync(new URL("../../../examples/", import.meta.url))
  .filter((f) => f.endsWith(".ui.md"))
  .map((f) => ({
    id: `example-${f}`,
    input: readFileSync(new URL(`../../../examples/${f}`, import.meta.url), "utf8"),
  }));

/** Text whose meaning changes under 2.0 (RFC-0001 §6). */
const CHANGES_MEANING = [
  /^\s*--- END [A-Z]/m, // typed closer
  /\{:/, // attribute list
  /\{\{/, // binding
  /\[\[/, // include
  /\[ ?(?!IMG)[A-Z]{2,}:/, // upper-case widget kind
  /^\s*\*\*\* .+ \*\*\*\s*$/m, // labelled divider
  /^\s*>\s*@(dark|light|print|reduced-motion|contrast-more|touch|hover)\b/m, // environment directive
  /^\s*(?:- )?::: (?!CARD :::|MODAL :::|HEADER :::|FOOTER :::|BUBBLE (USER|AGENT) :::)[A-Z]/m, // named container
];

function strip(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(strip);
  if (v !== null && typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (k === "span" || k === "lineStarts") continue;
      o[k] = strip(x);
    }
    return o;
  }
  return v;
}

function withDsl2(src: string): string {
  if (/^---\s*\n/.test(src)) return src.replace(/^---\s*\n/, "---\ndsl: 2.0\n");
  return `---\ndsl: 2.0\n---\n${src}`;
}

/** Documents whose frontmatter itself is malformed have no meaningful `dsl: 2.0` counterpart. */
const BROKEN_FRONTMATTER = ["E1006", "E1103", "E1104"];

const shared = [...fixtures, ...examples].filter(
  (f) =>
    !CHANGES_MEANING.some((re) => re.test(f.input)) &&
    !parse(f.input).diagnostics.some((d) => BROKEN_FRONTMATTER.includes(d.code)),
);

describe("v1 compatibility gate (T-024)", () => {
  it("covers most of the v1 corpus (exclusions are explicit)", () => {
    expect(shared.length).toBeGreaterThanOrEqual(fixtures.length + examples.length - 20);
  });
  it.each(shared.map((f) => [f.id, f] as const))(
    "%s parses identically under dsl: 2.0",
    (_id, f) => {
      const a = parse(f.input);
      const b = parse(withDsl2(f.input));
      expect(strip(b.body)).toEqual(strip(a.body));
      expect(b.diagnostics.map((d) => d.code)).toEqual(a.diagnostics.map((d) => d.code));
    },
  );
  it("detects a deliberate regression (gate is live)", () => {
    // a v1 document containing a typed closer changes meaning, so it is excluded — and would differ
    const src = "::: CARD :::\n--- END CARD ---\n--- END ---\n";
    expect(CHANGES_MEANING.some((re) => re.test(src))).toBe(true);
    expect(strip(parse(withDsl2(src)).body)).not.toEqual(strip(parse(src).body));
  });
});
