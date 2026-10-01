import { readFileSync, readdirSync } from "node:fs";
import { equivalent, parse } from "@mdui/core";
import { describe, expect, it } from "vitest";
import { migrate } from "../src/index.js";

describe("migrate (T-036)", () => {
  it("adds frontmatter with dsl: 2.0 when there is none", () => {
    const r = migrate("# Hi\n");
    expect(r.text).toBe("---\ndsl: 2.0\n---\n\n# Hi\n");
    expect(r.changes.map((c) => c.kind)).toEqual(["bump"]);
    expect(parse(r.text).dsl).toBe("2.0");
  });
  it("adds dsl: to existing frontmatter, or replaces dsl: 1.x", () => {
    expect(migrate("---\nframework: x\n---\nhi\n").text).toBe(
      "---\ndsl: 2.0\nframework: x\n---\nhi\n",
    );
    expect(migrate("---\ndsl: 1.0\nframework: x\n---\nhi\n").text).toBe(
      "---\ndsl: 2.0\nframework: x\n---\nhi\n",
    );
  });
  it("is a no-op for 2.0 documents", () => {
    const s = "---\ndsl: 2.0\n---\nhi\n";
    expect(migrate(s)).toMatchObject({ alreadyV2: true, text: s, changes: [] });
  });
  it("converts a date placeholder and a progress prose line, and lists exactly those changes", () => {
    const r = migrate("[ text: 2026-03-15 ]\n**75% complete**\n[ text: Name ]\n");
    expect(r.text).toContain("[ DATE: 2026-03-15 ]");
    expect(r.text).toContain("[ PROGRESS: 75% ]");
    expect(r.text).toContain("[ text: Name ]");
    expect(r.changes.map((c) => c.kind).sort()).toEqual(["bump", "date", "progress"]);
    expect(parse(r.text).diagnostics).toEqual([]);
  });
  it("does not touch 150% or code fences/comments", () => {
    const r = migrate("150% complete\n```\n[ text: 2026-03-15 ]\n```\n<!-- {{ x }} -->\n");
    expect(r.text).toContain("150% complete");
    expect(r.text).toContain("```\n[ text: 2026-03-15 ]\n```");
    expect(r.manual).toEqual([]);
  });
  it("lists text whose meaning changes under 2.0", () => {
    const r = migrate(
      "--- END CARD ---\nprice {{ x }}\n[ FOO: bar ]\n*** T ***\n> @dark a: b\n::: GRID :::\n[Go](/a){: .x }\n[[ y ]]\n",
    );
    expect(r.manual.map((m) => m.line)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it("migrating the shipped examples: parses clean, AST preserved, nothing unlisted changed", () => {
    const dir = new URL("../../../examples/", import.meta.url);
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".ui.md"))) {
      const src = readFileSync(new URL(f, dir), "utf8");
      const r = migrate(src);
      expect(r.manual, f).toEqual([]);
      const before = parse(src);
      const after = parse(r.text);
      expect(after.dsl).toBe("2.0");
      expect(
        after.diagnostics.map((d) => d.code),
        f,
      ).toEqual(before.diagnostics.map((d) => d.code));
      if (r.changes.every((c) => c.kind === "bump")) {
        // only `dsl:` was added to the frontmatter; everything else must be identical
        const { dsl: _dsl, ...meta } = after.meta as Record<string, unknown>;
        void _dsl;
        expect(equivalent({ ...after, meta: meta as typeof after.meta }, before), f).toBe(true);
      }
    }
  });
  it("only the listed lines change", () => {
    const src = "# T\n\n[ text: 2026-03-15 ]\n\nplain\n";
    const r = migrate(src);
    const a = src.split("\n");
    const b = r.text.split("\n");
    const changedBefore = new Set(r.changes.filter((c) => c.kind !== "bump").map((c) => c.line));
    // strip the 4 inserted frontmatter lines, then every differing line must be in the change list
    const rest = b.slice(4);
    rest.forEach((line, i) => {
      if (line !== a[i]) expect(changedBefore.has(i + 1)).toBe(true);
    });
  });
});
