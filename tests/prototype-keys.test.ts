import { analyze, format, parse } from "../packages/core/src/index.js";
import { render } from "../packages/render/src/index.js";
import { describe, expect, it } from "vitest";
import { fixSource, lint } from "../packages/lint/src/index.js";

/** User text becomes object keys in many places (attribute names, frontmatter keys, action names, binding paths, aliases).
 * None of these may ever reach Object.prototype. (Found by fast-check: a body line `toString` was parsed as a container.) */
const HAZARDS = [
  "toString",
  "constructor",
  "__proto__",
  "hasOwnProperty",
  "valueOf",
  "isPrototypeOf",
  "__defineGetter__",
];
const V2 = "---\ndsl: 2.0\nlang: en\n";

function everything(src: string): void {
  const doc = parse(src);
  analyze(doc, { readFile: () => undefined });
  lint(src);
  render(doc, { fragment: true });
  const f = format(src).text;
  expect(format(f).text).toBe(f);
  fixSource(src);
}

describe("prototype-key hazards", () => {
  for (const h of HAZARDS) {
    describe(h, () => {
      it("as a body line or list item is plain text", () => {
        const d = parse(`${h}\n- ${h}\n`);
        expect(d.diagnostics).toEqual([]);
        expect(d.body.map((n) => n.kind)).toEqual(["line", "list"]);
        everything(`${h}\n- ${h}\n`);
      });
      it("as a frontmatter key is an ordinary key, not a duplicate", () => {
        const d = parse(`---\n${h}: x\n---\nbody\n`);
        expect(Object.hasOwn(d.meta, h)).toBe(true);
        expect(d.diagnostics.map((x) => x.code)).toEqual(["W1204"]);
        everything(`---\n${h}: x\n${h}: y\n---\nbody\n`);
      });
      it("as an attribute, widget argument, or heading is handled", () => {
        const src = `${V2}---\n[ Go ]{: ${h}=1 ${h} }\n[ CHART: line ${h}=1 data=x ]\n# ${h}\n`;
        const d = parse(src);
        // attribute names start with a letter: `__proto__` is rejected as malformed, the others are unknown keys
        expect(d.diagnostics.map((x) => x.code)).toContain(h.startsWith("_") ? "E1301" : "W1301");
        everything(src);
      });
      it("as a binding path resolves only against declared data", () => {
        const withData = `${V2}data:\n  user:\n    name: Ann\n---\n{{ ${h} }} {{ user.${h} }}\n`;
        const codes = analyze(parse(withData)).diagnostics.map((x) => x.code);
        expect(codes).toEqual(["E2101", "E2101"]);
        const declared = `${V2}data:\n  ${h}:\n    x: 1\n---\n{{ ${h}.x }}\n`;
        expect(analyze(parse(declared)).diagnostics).toEqual([]);
        everything(withData);
        everything(declared);
      });
      it("as an EACH alias or action name", () => {
        const each = `${V2}data:\n  items:\n    - a\n---\n::: EACH ${h} in items :::\n{{ ${h} }}\n--- END EACH ---\n`;
        expect(analyze(parse(each)).diagnostics).toEqual([]);
        const reg = `${V2}actions:\n  ${h}:\n    intent: x\n---\n[ Ok ](#${h})\n[ Bad ](#other)\n`;
        expect(analyze(parse(reg)).diagnostics.map((x) => x.code)).toEqual(["E2501"]);
        const none = `${V2}actions:\n  real:\n    intent: x\n---\n[ Bad ](#${h})\n`;
        expect(analyze(parse(none)).diagnostics.map((x) => x.code)).toEqual(["E2501"]);
        everything(each);
        everything(reg);
      });
    });
  }
  it("nothing leaked onto Object.prototype", () => {
    for (const h of HAZARDS) everything(`---\n${h}: x\n---\n[ Go ]{: ${h}=1 }\n`);
    expect(Object.keys(Object.prototype)).toEqual([]);
    expect(({} as Record<string, unknown>)["x"]).toBeUndefined();
    expect(({} as Record<string, unknown>)["1"]).toBeUndefined();
  });
});
