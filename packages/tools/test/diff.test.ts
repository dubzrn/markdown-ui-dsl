import { parse } from "@vrillabs/mdui-core";
import { describe, expect, it } from "vitest";
import { diffDocuments, formatDiff } from "../src/index.js";

const d = (a: string, b: string) =>
  diffDocuments(parse(a), parse(b), { beforeSource: a, afterSource: b });
const kinds = (r: ReturnType<typeof d>) => r.ops.map((o) => `${o.op}:${o.desc}`);

describe("semantic diff (T-035)", () => {
  it("identical documents have no differences", () => {
    const s = "# T\n::: CARD :::\n[ Go ](#go)\n--- END ---\n";
    expect(d(s, s).ops).toEqual([]);
  });

  it("added, removed, changed", () => {
    const a = "[ Save ](#save)\n[ text: Email ]\n";
    const b = "[ Save changes ](#save)\n[ Cancel ](#cancel)\n";
    const r = d(a, b);
    expect(kinds(r)).toContain('changed:button "Save changes"');
    expect(r.ops.some((o) => o.op === "removed" && o.desc.startsWith("input"))).toBe(true);
    expect(r.ops.some((o) => o.op === "added" && o.desc === 'button "Cancel"')).toBe(true);
  });

  it("a reordered sibling is a move, not delete + add", () => {
    const a = "[ A ](#a)\n\n[ B ](#b)\n\n[ C ](#c)\n";
    const b = "[ C ](#c)\n\n[ A ](#a)\n\n[ B ](#b)\n";
    const r = d(a, b);
    expect(r.summary).toEqual({ added: 0, removed: 0, changed: 0, moved: 1 });
    expect(r.ops[0]).toMatchObject({ op: "moved" });
  });

  it("a block moved into another container is a move", () => {
    const a = "::: CARD :::\n[ Pay ](#pay)\n--- END ---\n::: CARD :::\nother\n--- END ---\n";
    const b = "::: CARD :::\n--- END ---\n::: CARD :::\nother\n[ Pay ](#pay)\n--- END ---\n";
    const r = d(a, b);
    expect(r.summary.moved).toBeGreaterThanOrEqual(1);
    expect(r.ops.filter((o) => o.op === "removed" && o.desc.includes("Pay"))).toEqual([]);
    expect(r.ops.filter((o) => o.op === "added" && o.desc.includes("Pay"))).toEqual([]);
  });

  it("elements keep their identity through an author #id", () => {
    const pre = "---\ndsl: 2.0\nlang: en\n---\n";
    const r = d(`${pre}[ Old name ](#x){: #pay }\n`, `${pre}[ New name ](#x){: #pay }\n`);
    expect(r.summary).toEqual({ added: 0, removed: 0, changed: 1, moved: 0 });
  });

  it("nested changes are reported with their path", () => {
    const r = d(
      "::: CARD :::\n[ A ](#a)\n--- END ---\n",
      "::: CARD :::\n[ A ](#a)\n[ B ](#b)\n--- END ---\n",
    );
    expect(r.ops).toHaveLength(1);
    expect(r.ops[0]).toMatchObject({ op: "added", desc: 'button "B"' });
    expect((r.ops[0] as { path: string }).path).toContain("card");
  });

  it("regression: a removed required input", () => {
    const pre = "---\ndsl: 2.0\nlang: en\n---\n";
    const r = d(`${pre}[ text: Email ]{: required }\n[ Go ](#go)\n`, `${pre}[ Go ](#go)\n`);
    expect(r.regressions.some((x) => x.startsWith("required element removed"))).toBe(true);
  });

  it("regression: an accessibility rule that newly fails", () => {
    const r = d("[Pricing](/p)\n", "[Pricing](/p)\n[click here](/x)\n");
    expect(r.regressions).toEqual(["accessibility rule newly failing: link-text (0 → 1)"]);
    expect(d("[click here](/x)\n", "[click here](/x)\n").regressions).toEqual([]);
  });

  it("human output lists each change and the totals", () => {
    const out = formatDiff(d("[ A ](#a)\n", "[ A ](#a)\n[ B ](#b)\n"));
    expect(out).toBe('+ button "B" (line 2)\n1 added, 0 removed, 0 changed, 0 moved\n');
  });

  it("table edits are reported as a change of the table", () => {
    const r = d("| A | B |\n| - | - |\n| 1 | 2 |\n", "| A | B |\n| - | - |\n| 1 | 3 |\n");
    expect(r.summary.changed).toBe(1);
  });
});
