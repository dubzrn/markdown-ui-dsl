import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lint } from "../src/index.js";

const evals = new URL("../../../evals/nov04/", import.meta.url);
const H = (c: string) => `---\ndsl: 2.0\nlang: en\nconstraints:\n  ${c}\n---\n`;
const codes = (src: string) => lint(src).diagnostics.map((d) => d.code);

describe("constraint contracts (T-079)", () => {
  it("every seeded violation is found and the clean set is silent (recall 100%, 0 false positives)", () => {
    const missed: string[] = [];
    let n = 0;
    for (const f of readdirSync(new URL("violations/", evals))) {
      const src = readFileSync(new URL(`violations/${f}`, evals), "utf8");
      const expect = /<!-- expect: (\w+) -->/.exec(src)?.[1] as string;
      n++;
      if (!codes(src).includes(expect)) missed.push(f);
    }
    expect(n).toBeGreaterThanOrEqual(20);
    expect(missed).toEqual([]);
    for (const f of readdirSync(new URL("clean/", evals)))
      expect(
        codes(readFileSync(new URL(`clean/${f}`, evals), "utf8")).filter((c) =>
          /^[EW]53\d\d$/.test(c),
        ),
        f,
      ).toEqual([]);
  });
  it("is a contract: nothing fires until a constraint is declared", () => {
    const body = "::: CARD :::\n[ A ](#a){: primary }\n[ B ](#b){: primary }\n--- END ---\n";
    expect(
      codes(`---\ndsl: 2.0\nlang: en\n---\n${body}`).filter((c) => c.startsWith("W53")),
    ).toEqual([]);
    expect(codes(`${H("max-primary-actions: 1")}${body}`)).toContain("W5301");
  });
  it("project-level constraints (config) apply without frontmatter", () => {
    const src = "---\ndsl: 2.0\nlang: en\n---\n# T\n### Skip\n";
    expect(
      lint(src, { constraints: { "heading-order": "strict" } }).diagnostics.map((d) => d.code),
    ).toContain("E5322");
  });
  it("a region hint overrides the declaration for that region only", () => {
    const src = `${H("max-primary-actions: 1")}::: CARD :::\n> constraint: max-primary-actions=2\n[ A ](#a){: primary }\n[ B ](#b){: primary }\n--- END ---\n::: CARD :::\n[ C ](#c){: primary }\n[ D ](#d){: primary }\n--- END ---\n`;
    const hits = lint(src).diagnostics.filter((d) => d.code === "W5301");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.span.start.line).toBeGreaterThan(10);
  });
  it("accessibility constraints are errors, the rest warnings", () => {
    const sev = (c: string, body: string) =>
      lint(`${H(c)}${body}`).diagnostics.find((d) => /^[EW]53/.test(d.code))?.severity;
    expect(sev("heading-order: strict", "## x\n")).toBe("error");
    expect(sev("form-fields: 0", '[ text: a ]{: label="a" }\n')).toBe("warn");
  });
  it("severity can be tuned per constraint", () => {
    const r = lint(`${H("heading-order: strict")}## x\n`, {
      config: { rules: { "constraint-heading-order": "warn" } },
    });
    expect(r.diagnostics.find((d) => d.code === "E5322")?.severity).toBe("warn");
  });
  it("hostile declarations never throw", () => {
    for (const c of [
      "x: [1, 2]",
      "form-fields: ''",
      "flow-depth: { max: -1 }",
      "states-required: 5",
      "tap-target: { min: 1e999 }",
    ])
      expect(() => lint(`${H(c)}text\n`)).not.toThrow();
  });
});

describe("waivers (T-082)", () => {
  const H2 = H("form-fields: 1");
  const fields = (waive: string) =>
    `${H2}::: CARD :::\n${waive}[ text: a ]{: label="a" }\n[ text: b ]{: label="b" }\n--- END ---\n`;
  it("suppresses the waived constraint in its region and lists the waiver", () => {
    const r = lint(fields('> waive: form-fields reason="Checkout needs two fields"\n'));
    expect(r.diagnostics.map((d) => d.code)).not.toContain("W5302");
    expect(r.waivers).toHaveLength(1);
    expect(r.waivers[0]).toMatchObject({
      rule: "form-fields",
      reason: "Checkout needs two fields",
      suppressed: 1,
    });
  });
  it("removing the waiver re-surfaces the diagnostic", () => {
    expect(codes(fields(""))).toContain("W5302");
  });
  it("a waiver outside the region does not cover it", () => {
    const src = `${H2}> waive: form-fields reason="elsewhere"\n::: CARD :::\n[ text: a ]{: label="a" }\n[ text: b ]{: label="b" }\n--- END ---\n`;
    // document-level waiver covers the whole document, so this one does suppress
    expect(codes(src)).not.toContain("W5302");
    const other = `${H2}::: CARD :::\n> waive: form-fields reason="x"\n--- END ---\n::: CARD :::\n[ text: a ]{: label="a" }\n[ text: b ]{: label="b" }\n--- END ---\n`;
    expect(codes(other)).toContain("W5302");
  });
  it("needs a reason and a known constraint (E5333); an unused waiver is reported (I5334)", () => {
    expect(codes(fields("> waive: form-fields\n"))).toContain("E5333");
    expect(codes(fields('> waive: nonsense reason="x"\n'))).toContain("E5333");
    const unused = lint(
      `${H("form-fields: 5")}::: CARD :::\n> waive: form-fields reason="not needed"\n[ text: a ]{: label="a" }\n--- END ---\n`,
    );
    expect(unused.diagnostics.map((d) => d.code)).toContain("I5334");
  });
  it("only the named constraint is waived", () => {
    const src = `${H("heading-order: strict")}${'> waive: form-fields reason="irrelevant"\n'}### skipped\n`;
    expect(codes(src)).toContain("E5322");
  });
});
