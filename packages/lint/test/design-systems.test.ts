import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lintDesignSystem } from "../src/index.js";
import {
  loadDesignSystem,
  toCssVars,
  toDtcg,
  toTailwind3,
  toTailwind4,
  validateDtcg,
} from "@mdui/tokens";

const dir = new URL("../../../examples/design-systems/", import.meta.url);
const NEW = ["react-shadcn", "swiftui", "compose", "vue-nuxt", "angular-material", "lit"];

describe("example design systems (T-057)", () => {
  it("there are at least four DESIGN.md-format examples", () => {
    const real = readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .filter((f) => loadDesignSystem(readFileSync(new URL(f, dir), "utf8")).kind === "design.md");
    expect(real.length).toBeGreaterThanOrEqual(4);
  });
  for (const name of NEW) {
    const src = readFileSync(new URL(`${name}.md`, dir), "utf8");
    it(`${name}: loads, token-lints clean, maps breakpoints and exports`, () => {
      const ds = loadDesignSystem(src);
      expect(ds.kind).toBe("design.md");
      expect(ds.diagnostics).toEqual([]);
      expect(lintDesignSystem(src).diagnostics).toEqual([]);
      expect(Object.keys(ds.mdui.breakpoints ?? {})).toEqual(["sm", "md", "lg", "xl"]);
      expect(ds.mdui.framework).toBeTruthy();
      expect(validateDtcg(toDtcg(ds).file)).toEqual([]);
      for (const out of [toTailwind3(ds).report, toTailwind4(ds).report, toCssVars(ds).report])
        expect(out.warnings).toEqual([]);
    });
    it(`${name}: documents dark and touch environments`, () => {
      expect(src).toMatch(/> @dark/);
      expect(src).toMatch(/> @touch/);
    });
  }
});
