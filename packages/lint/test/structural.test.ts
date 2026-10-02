import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lint } from "../src/index.js";

const conf = new URL("../../spec/conformance/", import.meta.url);
const invalid = JSON.parse(readFileSync(new URL("v1/invalid.json", conf), "utf8")) as {
  id: string;
  input: string;
  expect: { diagnostics: { code: string; line: number }[] };
}[];

const rules = (src: string, opts = {}) =>
  lint(src, opts).diagnostics.map((d) => `${d.rule}:${d.code}@${d.span.start.line}`);

describe("structural rules (T-028)", () => {
  it("the four original defective examples fail balanced-blocks with the correct spans", () => {
    const originals = invalid.filter((f) => f.id.startsWith("regression-original-"));
    expect(originals).toHaveLength(4);
    for (const f of originals) {
      const found = lint(f.input).diagnostics.filter((d) => d.rule === "balanced-blocks");
      expect(
        found.map((d) => ({ code: d.code, line: d.span.start.line })),
        f.id,
      ).toEqual(f.expect.diagnostics);
    }
  });

  it("the shipped examples pass cleanly under every rule", () => {
    const dir = new URL("../../../examples/", import.meta.url);
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".ui.md")))
      expect(lint(readFileSync(new URL(f, dir), "utf8")).diagnostics, f).toEqual([]);
  });

  it("balanced-blocks", () =>
    expect(rules("::: CARD :::\nx\n")).toEqual(["balanced-blocks:E1001@1"]));
  it("orphan-closer", () => expect(rules("--- END ---\n")).toEqual(["orphan-closer:E1002@1"]));
  it("duplicate-id", () =>
    expect(rules("---\ndsl: 2.0\n---\n[ A ]{: #a }\n[ B ]{: #a }\n")).toEqual([
      "document-language:I3114@1",
      "duplicate-id:E2001@5",
    ]));
  it("unknown-directive", () =>
    expect(rules("> @xs a: b\n")).toEqual(["unknown-directive:W1201@1"]));
  it("empty-container", () =>
    expect(rules("::: CARD :::\n--- END ---\n")).toEqual(["empty-container:W1401@1"]));
  it("empty-container exempts EMPTY", () =>
    expect(rules("---\ndsl: 2.0\nlang: en\n---\n::: EMPTY :::\n--- END ---\n")).toEqual([]));
  it("broken-link-or-include: empty target", () =>
    expect(rules("[Docs]()\n")).toEqual(["broken-link-or-include:W2601@1"]));
  it("broken-link-or-include: missing include", () =>
    expect(
      rules("---\ndsl: 2.0\nlang: en\n---\n[[ USE: ./nope.ui.md ]]\n", {
        readFile: () => undefined,
      }),
    ).toEqual(["broken-link-or-include:E2304@5"]));

  it("severity can be overridden and rules turned off", () => {
    const r = lint("::: CARD :::\n--- END ---\n", {
      config: { rules: { "empty-container": "error" } },
    });
    expect(r.diagnostics[0]?.severity).toBe("error");
    expect(
      lint("::: CARD :::\n--- END ---\n", { config: { rules: { "empty-container": "off" } } })
        .diagnostics,
    ).toEqual([]);
  });

  it("an unterminated comment is reported by its rule", () => {
    expect(rules("<!-- oops\n")).toEqual(["unterminated-block:E1003@1"]);
  });

  it("turning off balanced-blocks does not resurface its diagnostics as `syntax`", () => {
    const r = lint("::: CARD :::\nx\n", { config: { rules: { "balanced-blocks": "off" } } });
    expect(r.diagnostics).toEqual([]);
  });
});
