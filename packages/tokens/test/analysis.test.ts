import { describe, expect, it } from "vitest";
import {
  checkBreakpoints,
  checkContrast,
  checkOrphans,
  checkPrimary,
  checkRefs,
  contrastPairs,
  diffTokens,
  formatTokenDiff,
  loadDesignSystem,
} from "../src/index.js";

const ds = (yaml: string) => loadDesignSystem(`---\n${yaml}\n---\n`);

describe("broken-ref", () => {
  it("flags missing targets and cycles with the offending line", () => {
    const d = ds(
      'colors:\n  a: "{colors.nope}"\n  b: "{colors.c}"\n  c: "{colors.b}"\n  ok: "#fff"\ncomponents:\n  x:\n    textColor: "{colors.ok}"\n    backgroundColor: "{colors.zzz}"',
    );
    const f = checkRefs(d);
    expect(f.map((x) => `${x.code}@${x.line} ${x.path}`)).toEqual([
      "E4001@3 colors.a",
      "E4001@4 colors.b",
      "E4001@5 colors.c",
      "E4001@10 components.x.backgroundColor",
    ]);
    expect(f[1]?.message).toMatch(/cycle/);
  });
  it("passes when everything resolves", () =>
    expect(checkRefs(ds('colors:\n  a: "#fff"\n  b: "{colors.a}"'))).toEqual([]));
});

describe("contrast-ratio (published vectors)", () => {
  const pair = (bg: string, fg: string) =>
    ds(
      `colors:\n  bg: "${bg}"\n  fg: "${fg}"\ncomponents:\n  btn:\n    backgroundColor: "{colors.bg}"\n    textColor: "{colors.fg}"`,
    );
  it.each([
    ["#ffffff", "#000000", 21, false],
    ["#ffffff", "#767676", 4.54, false],
    ["#ffffff", "#777777", 4.48, true],
    ["#ffff00", "#ffffff", 1.07, true],
  ])("%s / %s = %s:1 (fails: %s)", (bg, fg, ratio, fails) => {
    expect(Math.round((contrastPairs(pair(bg, fg))[0]?.ratio ?? 0) * 100) / 100).toBe(ratio);
    expect(checkContrast(pair(bg, fg)).length > 0).toBe(fails);
  });
  it("skips translucent and unsupported colors rather than guessing", () => {
    expect(contrastPairs(pair("rgb(0 0 0 / 50%)", "#fff"))).toEqual([]);
    expect(contrastPairs(pair("oklch(0.5 0.1 20)", "#fff"))).toEqual([]);
  });
  it("the message carries the numbers", () => {
    expect(checkContrast(pair("#ffff00", "#ffffff"))[0]?.message).toContain("1.07:1");
  });
});

describe("orphaned-token, unknown-breakpoint, missing-primary", () => {
  it("orphans are colors nothing references; none reported without components", () => {
    const d = ds(
      'colors:\n  primary: "#000"\n  extra: "#111"\n  chain: "#222"\n  alias: "{colors.chain}"\ncomponents:\n  b:\n    textColor: "{colors.primary}"\n    backgroundColor: "{colors.alias}"',
    );
    expect(checkOrphans(d).map((f) => f.path)).toEqual(["colors.extra"]);
    expect(checkOrphans(ds('colors:\n  a: "#000"'))).toEqual([]);
  });
  it("breakpoints must be sm|md|lg|xl and ascend", () => {
    expect(
      checkBreakpoints(ds("mdui:\n  breakpoints:\n    sm: 640px\n    md: 768px\n    lg: 1024px")),
    ).toEqual([]);
    const f = checkBreakpoints(
      ds("mdui:\n  breakpoints:\n    sm: 640px\n    tablet: 700px\n    md: 600px"),
    );
    expect(f.map((x) => x.message)).toEqual([
      expect.stringContaining('"tablet" is unknown'),
      expect.stringContaining('"md" (600px) must be wider than "sm"'),
    ]);
    expect(checkBreakpoints(ds("name: x"))).toEqual([]);
  });
  it("a DESIGN.md needs colors.primary; legacy prose files are exempt", () => {
    expect(checkPrimary(ds("name: x\ncolors:\n  secondary: red")).map((f) => f.code)).toEqual([
      "W4005",
    ]);
    expect(checkPrimary(ds("colors:\n  primary: red"))).toEqual([]);
    expect(checkPrimary(loadDesignSystem("# Prose only\n"))).toEqual([]);
  });
});

describe("token diff", () => {
  const a = ds(
    'colors:\n  primary: "#000000"\n  accent: "#00ff00"\ncomponents:\n  btn:\n    backgroundColor: "{colors.primary}"\n    textColor: "#ffffff"',
  );
  it("lists added, removed, changed", () => {
    const b = ds(
      'colors:\n  primary: "#111111"\n  extra: "#abcdef"\ncomponents:\n  btn:\n    backgroundColor: "{colors.primary}"\n    textColor: "#ffffff"',
    );
    const d = diffTokens(a, b);
    expect(d.summary).toEqual({ added: 1, removed: 1, changed: 1 });
    expect(d.regressions).toEqual(["token removed: colors.accent"]);
    expect(formatTokenDiff(d)).toContain("~ colors.primary: #000000 → #111111");
  });
  it("a change that breaks AA contrast is a regression even when nothing is removed", () => {
    const b = ds(
      'colors:\n  primary: "#eeeeee"\n  accent: "#00ff00"\ncomponents:\n  btn:\n    backgroundColor: "{colors.primary}"\n    textColor: "#ffffff"',
    );
    expect(diffTokens(a, b).regressions).toEqual([
      "contrast newly fails AA: components.btn.textColor",
    ]);
  });
  it("identical systems have no deltas", () =>
    expect(diffTokens(a, a)).toMatchObject({ deltas: [], regressions: [] }));
});
