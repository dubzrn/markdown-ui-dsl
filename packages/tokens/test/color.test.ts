import { describe, expect, it } from "vitest";
import { contrastRatio, parseColor, toHex, type Rgba } from "../src/color.js";

const must = (s: string): Rgba => {
  const c = parseColor(s);
  if (c === undefined) throw new Error(`unparseable color ${s}`);
  return c;
};

const ratio = (a: string, b: string): number => contrastRatio(must(a), must(b));
const r2 = (n: number): number => Math.round(n * 100) / 100;

describe("contrast ratio — published WCAG vectors", () => {
  it.each([
    ["#000000", "#ffffff", 21],
    ["#ffffff", "#ffffff", 1],
    ["#767676", "#ffffff", 4.54], // the lightest grey that passes AA on white
    ["#777777", "#ffffff", 4.48], // one step lighter fails AA
    ["#ff0000", "#ffffff", 4.0],
    ["#0000ff", "#ffffff", 8.59],
    ["#ffff00", "#ffffff", 1.07],
    ["#595959", "#ffffff", 7.0], // AAA boundary for normal text
  ])("%s on %s = %s:1", (a, b, expected) => {
    expect(r2(ratio(a, b))).toBe(expected);
    expect(r2(ratio(b, a))).toBe(expected); // symmetric
  });
});

describe("parseColor", () => {
  it("hex forms", () => {
    expect(parseColor("#fff")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor("#1A1C1E")).toEqual({ r: 26, g: 28, b: 30, a: 1 });
    expect(parseColor("#ff000080")?.a).toBeCloseTo(0.502, 2);
    expect(parseColor("#f00f")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });
  it("rgb/rgba/hsl in comma and space syntax", () => {
    expect(toHex(must("rgb(255, 0, 0)"))).toBe("#ff0000");
    expect(toHex(must("rgb(0 128 0 / 50%)"))).toBe("#008000");
    expect(parseColor("rgba(0,0,0,.5)")?.a).toBe(0.5);
    expect(toHex(must("hsl(0, 100%, 50%)"))).toBe("#ff0000");
    expect(toHex(must("hsl(120 100% 25%)"))).toBe("#008000");
    expect(toHex(must("rgb(100%, 0%, 0%)"))).toBe("#ff0000");
  });
  it("names", () => {
    expect(toHex(must("White"))).toBe("#ffffff");
    expect(parseColor("transparent")?.a).toBe(0);
  });
  it("unsupported formats are undefined, not guessed", () => {
    for (const s of [
      "oklch(0.6 0.2 30)",
      "color-mix(in srgb, red, blue)",
      "notacolor",
      "#12",
      "#ggg",
      "rgb(1,2)",
      "rgb(a,b,c)",
      "",
    ])
      expect(parseColor(s), s).toBeUndefined();
  });
});
