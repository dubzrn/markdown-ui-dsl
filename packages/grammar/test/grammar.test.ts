import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "@vrillabs/mdui-core";
import { buildGrammar, generator, recognizer, toGbnf, toLark, type Grammar } from "../src/index.js";

const conf = new URL("../../spec/conformance/", import.meta.url);
interface Fixture {
  id: string;
  input: string;
}
const load = (f: string): Fixture[] =>
  JSON.parse(readFileSync(new URL(f, conf), "utf8")) as Fixture[];
const allowed = JSON.parse(
  readFileSync(new URL("accepted-invalid.json", import.meta.url), "utf8"),
) as Record<string, string[] | string>;
const nl = (s: string): string => (s.endsWith("\n") ? s : `${s}\n`);

const rec1 = recognizer(buildGrammar({ dsl: "1", profile: "recognize" }));
const rec2 = recognizer(buildGrammar({ dsl: "2.0", profile: "recognize" }));

describe("grammar parity with the reference parser (T-058)", () => {
  it("accepts every valid fixture", () => {
    const files: [string, typeof rec1][] = [
      ["v1/valid.json", rec1],
      ["v2/valid.json", rec2],
      ["v2/block-valid.json", rec2],
    ];
    for (const [f, rec] of files)
      for (const x of load(f)) expect(rec(nl(x.input)).ok, `${f}: ${x.id}`).toBe(true);
  });

  it("rejects every structurally invalid fixture; the rest are an explicit allow-list", () => {
    const files: [string, typeof rec1][] = [
      ["v1/invalid.json", rec1],
      ["v2/invalid.json", rec2],
      ["v2/block-invalid.json", rec2],
    ];
    for (const [f, rec] of files) {
      const accepted = load(f)
        .filter((x) => rec(nl(x.input)).ok)
        .map((x) => x.id);
      expect(accepted, f).toEqual(allowed[f]);
    }
    // the structural classes are never in the allow-list
    const all = Object.values(allowed).flat().join(" ");
    expect(all).not.toMatch(/unclosed|orphan|typed-closer|unknown-container|bubble-closer/);
  });

  for (const dsl of ["1", "2.0"] as const) {
    const g = buildGrammar({ dsl });
    const gen = generator(g);
    const rec = recognizer(g);
    it(
      `DSL ${dsl}: generated strings are accepted by the recogniser (100)`,
      { timeout: 60_000 },
      () => {
        for (let s = 1; s <= 100; s++) {
          const doc = gen(s);
          expect(rec(doc).ok, `seed ${s}\n${doc}`).toBe(true);
        }
      },
    );
    it(`DSL ${dsl}: 5,000 generated strings parse with zero errors under the reference parser`, () => {
      for (let s = 1; s <= 5000; s++) {
        const doc = gen(s);
        const errors = parse(doc).diagnostics.filter((d) => d.severity === "error");
        expect(
          errors.map((e) => `${e.code}@${e.span.start.line}`),
          `seed ${s}\n${doc}`,
        ).toEqual([]);
      }
    });
  }

  it("typed closers must match; untyped closers always do", () => {
    const g = recognizer(buildGrammar({ dsl: "2.0" }));
    const H = "---\ndsl: 2.0\n---\n";
    expect(g(`${H}::: CARD :::\n--- END CARD ---\n`).ok).toBe(true);
    expect(g(`${H}::: CARD :::\n--- END ---\n`).ok).toBe(true);
    expect(g(`${H}::: CARD :::\n--- END ROW ---\n`).ok).toBe(false);
  });

  it("an opener without its closer is not derivable", () => {
    const g = recognizer(buildGrammar({ dsl: "1" }));
    expect(g("::: CARD :::\nx\n").ok).toBe(false);
    expect(g("--- END ---\n").ok).toBe(false);
    expect(g("::: CARD :::\n::: ROW :::\n--- END ---\n").ok).toBe(false);
  });
});

describe("depth bound (T-059c)", () => {
  const bounded = buildGrammar({ dsl: "1", maxDepth: 2 });
  const rec = recognizer(bounded);
  it("accepts nesting up to the bound and rejects beyond it", () => {
    expect(rec("||| COLUMN |||\n::: CARD :::\nx\n--- END ---\n--- END ---\n").ok).toBe(true);
    expect(
      rec("||| COLUMN |||\n::: CARD :::\n=== ROW ===\nx\n--- END ---\n--- END ---\n--- END ---\n")
        .ok,
    ).toBe(false);
  });
  it("generated strings never nest deeper than the bound", () => {
    const gen = generator(bounded, { maxNest: 5 });
    for (let s = 1; s <= 300; s++) {
      let depth = 0;
      let max = 0;
      for (const line of gen(s).split("\n")) {
        if (/^\s*(- )?(\|\|\| |=== |::: )/.test(line)) max = Math.max(max, ++depth);
        else if (/^\s*--- END/.test(line)) depth--;
      }
      expect(max, `seed ${s}`).toBeLessThanOrEqual(2);
    }
  });
});

describe("emitters: constraints found by real engines", () => {
  for (const dsl of ["1", "2.0"] as const) {
    it(`DSL ${dsl}: Lark output has no empty terminal; GBNF has no unsupported class escapes`, () => {
      const g = buildGrammar({ dsl, maxDepth: 3 });
      // Lark: `""` as a terminal is an error (epsilon is expressed with `?`); an empty `("")?` fallback must not appear either
      expect(toLark(g)).not.toMatch(/(^|[ (|])""([ )|*+?]|$)/m);
      // GBNF only knows \\ \n \r \t \[ \] and \xNN inside classes: scan classes outside string literals
      const text = toGbnf(g).replace(/^#.*$/gm, "");
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
          for (i++; i < text.length && text[i] !== '"'; i++) if (text[i] === "\\") i++;
        } else if (c === "[") {
          for (i++; i < text.length && text[i] !== "]"; i++) {
            if (text[i] === "\\") {
              i++;
              expect(
                "\\nrt[]x".includes(text[i] as string),
                `escape \\${text[i]} in a GBNF class`,
              ).toBe(true);
            }
          }
        }
      }
    });
  }
});

describe("emitters", () => {
  const g = buildGrammar({ dsl: "2.0" });
  const names = (grammar: Grammar): Set<string> => new Set(grammar.rules.keys());
  it("are deterministic", () => {
    expect(toLark(g)).toBe(toLark(buildGrammar({ dsl: "2.0" })));
    expect(toGbnf(g)).toBe(toGbnf(buildGrammar({ dsl: "2.0" })));
  });
  it("Lark: every referenced rule is defined", () => {
    const text = toLark(g).replace(/^\/\/.*$/gm, "");
    const defined = new Set([...text.matchAll(/^([a-z0-9_]+):/gm)].map((m) => m[1]));
    const body = text.replace(/\/\[[^\n]*?\]\//g, "").replace(/"(?:[^"\\]|\\.)*"/g, "");
    for (const m of body.matchAll(/\b[a-z][a-z0-9_]*\b/g))
      expect(defined.has(m[0]), m[0]).toBe(true);
    expect(text).toMatch(/^start: document$/m);
    expect(names(g).has("document")).toBe(true);
  });
  it("GBNF: has a root and defines every referenced rule", () => {
    const text = toGbnf(g).replace(/^#.*$/gm, "");
    expect(text).toMatch(/^root ::= document$/m);
    const defined = new Set([...text.matchAll(/^([a-z0-9-]+) ::=/gm)].map((m) => m[1]));
    // drop string literals and character classes with a scanner (they may contain quotes and brackets)
    let body = "";
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        for (i++; i < text.length && text[i] !== '"'; i++) if (text[i] === "\\") i++;
        body += " ";
      } else if (c === "[") {
        for (i++; i < text.length && text[i] !== "]"; i++) if (text[i] === "\\") i++;
        body += " ";
      } else body += c;
    }
    for (const m of body.matchAll(/\b[a-z][a-z0-9-]*\b/g))
      expect(defined.has(m[0]) || m[0] === "root", m[0]).toBe(true);
  });
});
