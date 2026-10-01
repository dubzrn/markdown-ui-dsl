import { readFileSync } from "node:fs";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { outline, parse } from "../src/index.js";

interface Fixture {
  id: string;
  input: string;
  expect: { outline?: string; diagnostics: { code: string; line: number }[] };
}
const dir = new URL("../../spec/conformance/", import.meta.url);
const load = (f: string): Fixture[] =>
  JSON.parse(readFileSync(new URL(f, dir), "utf8")) as Fixture[];
const schema = JSON.parse(readFileSync(new URL("fixture.schema.json", dir), "utf8")) as object;
const valid = load("v1/valid.json");
const invalid = load("v1/invalid.json");
const valid2 = load("v2/valid.json");
const invalid2 = load("v2/invalid.json");

describe("corpus shape", () => {
  const validate = new Ajv2020().compile(schema);
  it("validates against its own schema", () => {
    expect(validate(valid), JSON.stringify(validate.errors)).toBe(true);
    expect(validate(invalid), JSON.stringify(validate.errors)).toBe(true);
    expect(validate(valid2), JSON.stringify(validate.errors)).toBe(true);
    expect(validate(invalid2), JSON.stringify(validate.errors)).toBe(true);
  });
  it("meets the size floor and has unique ids", () => {
    expect(valid.length).toBeGreaterThanOrEqual(60);
    expect(invalid.length).toBeGreaterThanOrEqual(60);
    const ids = [...valid, ...invalid].map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("valid fixtures expect no diagnostics; invalid expect some", () => {
    for (const f of valid) expect(f.expect.diagnostics, f.id).toEqual([]);
    for (const f of invalid) expect(f.expect.diagnostics.length, f.id).toBeGreaterThan(0);
  });
});

describe.each([
  ["valid", valid],
  ["invalid", invalid],
  ["v2 valid", valid2],
  ["v2 invalid", invalid2],
] as const)("conformance v1 %s", (_name, fixtures) => {
  it.each(fixtures.map((f) => [f.id, f] as const))("%s", (_id, f) => {
    const doc = parse(f.input);
    expect(doc.diagnostics.map((d) => ({ code: d.code, line: d.span.start.line }))).toEqual(
      f.expect.diagnostics,
    );
    if (f.expect.outline !== undefined) expect(outline(doc)).toBe(f.expect.outline);
  });
});
