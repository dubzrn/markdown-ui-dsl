import { readFileSync, readdirSync } from "node:fs";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { analyze, parse } from "../src/index.js";

const schema = JSON.parse(
  readFileSync(new URL("../../spec/schema/ast.schema.json", import.meta.url), "utf8"),
) as object;
const validate = new Ajv2020({ strict: false }).compile(schema);

const fixtureFiles = [
  "v1/valid.json",
  "v1/invalid.json",
  "v2/valid.json",
  "v2/invalid.json",
  "v2/block-valid.json",
  "v2/block-invalid.json",
  "v2/semantic.json",
];
const inputs: [string, string][] = [];
for (const f of fixtureFiles) {
  const list = JSON.parse(
    readFileSync(new URL(`../../spec/conformance/${f}`, import.meta.url), "utf8"),
  ) as { id: string; input: string }[];
  for (const x of list) inputs.push([`${f}:${x.id}`, x.input]);
}
for (const f of readdirSync(new URL("../../../examples/", import.meta.url)).filter((x) =>
  x.endsWith(".ui.md"),
))
  inputs.push([
    `examples/${f}`,
    readFileSync(new URL(`../../../examples/${f}`, import.meta.url), "utf8"),
  ]);

describe("AST JSON Schema (T-019)", () => {
  it("$id encodes the DSL version", () => {
    expect((schema as { $id: string }).$id).toMatch(/ast-2\.0\.schema\.json$/);
  });
  it(`validates the AST of all ${inputs.length} corpus documents`, () => {
    const bad: string[] = [];
    for (const [id, src] of inputs) {
      const doc = parse(src);
      const json = JSON.parse(JSON.stringify(doc)) as unknown;
      if (!validate(json)) bad.push(`${id}: ${JSON.stringify(validate.errors?.slice(0, 2))}`);
    }
    expect(bad).toEqual([]);
  });
  it("validates analysis diagnostics too", () => {
    const doc = parse("---\ndsl: 2.0\n---\n{{ nope }}\n::: STATE x :::\n--- END ---\n");
    const r = analyze(doc);
    const json = JSON.parse(
      JSON.stringify({ ...doc, diagnostics: [...doc.diagnostics, ...r.diagnostics] }),
    ) as unknown;
    expect(validate(json), JSON.stringify(validate.errors)).toBe(true);
  });
  it("rejects a malformed AST (schema is not vacuous)", () => {
    expect(validate({ meta: {}, dsl: "3", body: [], diagnostics: [], lineStarts: [] })).toBe(false);
    expect(
      validate({
        meta: {},
        dsl: "1",
        body: [{ kind: "nonsense" }],
        diagnostics: [],
        lineStarts: [],
      }),
    ).toBe(false);
  });
});
