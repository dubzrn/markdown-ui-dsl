import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BlockNode, DirectiveNode } from "../src/index.js";
import { parse } from "../src/index.js";

function directives(nodes: BlockNode[]): DirectiveNode[] {
  return nodes.flatMap((n): DirectiveNode[] => {
    if (n.kind === "directive") return [n];
    if ("children" in n) return directives(n.children as BlockNode[]);
    return [];
  });
}

describe("directive parser (T-018)", () => {
  it("v1 responsive example: directives are unchanged (snapshot)", async () => {
    const src = readFileSync(
      new URL("../../../examples/responsive-layout.ui.md", import.meta.url),
      "utf8",
    );
    const doc = parse(src);
    expect(doc.diagnostics).toEqual([]);
    const flat = directives(doc.body).map((d) => ({
      breakpoint: d.breakpoint,
      env: d.env,
      tokens: d.tokens,
    }));
    await expect(JSON.stringify(flat, null, 2) + "\n").toMatchFileSnapshot(
      "snapshots/responsive-layout.directives.json",
    );
  });

  it("2.0 env + breakpoint directive exposes fields", () => {
    const doc = parse("---\ndsl: 2.0\n---\n> @md @dark surface: inverted, gap: 8\n");
    expect(doc.dsl).toBe("2.0");
    const [d] = directives(doc.body);
    expect(d).toMatchObject({
      breakpoint: "md",
      env: ["dark"],
      tokens: [
        { name: "surface", value: "inverted" },
        { name: "gap", value: "8" },
      ],
    });
  });

  it("env-only directive has no breakpoint property", () => {
    const [d] = directives(parse("---\ndsl: 2.0\n---\n> @touch a: b\n").body);
    expect(d && "breakpoint" in d).toBe(false);
  });

  it("the same line is a hint under 1.x and a directive under 2.0", () => {
    expect(directives(parse("> @dark a: b\n").body)).toEqual([]);
    expect(directives(parse("---\ndsl: 2.0\n---\n> @dark a: b\n").body)).toHaveLength(1);
  });
});
