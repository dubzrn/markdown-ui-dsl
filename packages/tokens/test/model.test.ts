import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isRef, loadDesignSystem, lookup, resolveRef, sections } from "../src/index.js";

const SAMPLE = `---
version: alpha
name: Heritage
colors:
  primary: "#1A1C1E"
  secondary: "#6C7278"
  link: "{colors.primary}"
typography:
  h1:
    fontFamily: Public Sans
    fontSize: 3rem
    fontWeight: 600
    lineHeight: 1.1
rounded:
  sm: 4px
spacing:
  md: 16px
  gutter: 24
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    typography: "{typography.h1}"
mdui:
  breakpoints:
    sm: 640px
    md: 768px
  framework: Next.js
---

## Overview

Warm, editorial.

## Colors

- **Primary (#1A1C1E):** ink
`;

describe("DESIGN.md loader (T-037)", () => {
  it("loads tokens, prose sections and the mdui extension", () => {
    const ds = loadDesignSystem(SAMPLE);
    expect(ds.kind).toBe("design.md");
    expect(ds.name).toBe("Heritage");
    expect(ds.version).toBe("alpha");
    expect(ds.diagnostics).toEqual([]);
    expect(ds.tokens.colors["primary"]).toBe("#1A1C1E");
    expect(ds.tokens.typography["h1"]).toEqual({
      fontFamily: "Public Sans",
      fontSize: "3rem",
      fontWeight: 600,
      lineHeight: 1.1,
    });
    expect(ds.tokens.spacing["gutter"]).toBe(24);
    expect(ds.tokens.components["button-primary"]?.["backgroundColor"]).toBe("{colors.primary}");
    expect(Object.keys(ds.prose)).toEqual(["Overview", "Colors"]);
    expect(ds.mdui).toEqual({ breakpoints: { sm: "640px", md: "768px" }, framework: "Next.js" });
  });
  it("records source lines for token paths", () => {
    const ds = loadDesignSystem(SAMPLE);
    expect(ds.lines["colors.primary"]).toBe(5);
    expect(ds.lines["typography.h1.fontSize"]).toBe(11);
    expect(ds.lines["components.button-primary.textColor"]).toBe(22);
  });
  it("a version mismatch is a warning, not a crash", () => {
    const ds = loadDesignSystem("---\nversion: beta2\ncolors:\n  primary: red\n---\n");
    expect(ds.diagnostics.map((d) => d.code)).toEqual(["W4101"]);
    expect(ds.tokens.colors["primary"]).toBe("red");
  });
  it("loads the three shipped (legacy, prose-only) design systems", () => {
    const dir = new URL("../../../examples/design-systems/", import.meta.url);
    const files = ["blazor-bootstrap.md", "flutter-material.md", "web-tailwind.md"];
    expect(files.every((f) => readdirSync(dir).includes(f))).toBe(true);
    for (const f of files) {
      const ds = loadDesignSystem(readFileSync(new URL(f, dir), "utf8"));
      expect(ds.kind, f).toBe("legacy");
      expect(ds.diagnostics, f).toEqual([]);
      expect(Object.keys(ds.prose).length, f).toBeGreaterThan(1);
    }
  });
  // `reference/` is an optional submodule (not checked out in CI): skipped there, run locally and in reference-check
  it.skipIf(!existsSync(new URL("../../../reference/tokens/design-md/examples/", import.meta.url)))(
    "loads the upstream sample DESIGN.md files",
    () => {
      const base = new URL("../../../reference/tokens/design-md/examples/", import.meta.url);
      for (const d of readdirSync(base)) {
        const ds = loadDesignSystem(readFileSync(new URL(`${d}/DESIGN.md`, base), "utf8"));
        expect(ds.kind, d).toBe("design.md");
        expect(
          ds.diagnostics.filter((x) => x.severity === "error"),
          d,
        ).toEqual([]);
        expect(Object.keys(ds.tokens.colors).length, d).toBeGreaterThan(0);
      }
    },
  );
  it("never throws on malformed input", () => {
    for (const s of [
      "---\ncolors: [a, b]\n---\n",
      "---\n: : :\n---\n",
      "---\ncolors:\n  a: [1]\ntypography: 5\n---\n",
      "---\n- list\n---\n",
      "---\nname: x\nname: y\n---\n",
      "",
      "---\n",
    ]) {
      expect(() => loadDesignSystem(s), s).not.toThrow();
    }
    expect(loadDesignSystem("---\nname: x\nname: y\n---\n").diagnostics[0]?.code).toBe("E4101");
  });
  it("YAML aliases are bounded (no billion laughs)", () => {
    const bomb = `---\na: &a [x,x,x,x,x,x,x,x,x]\nb: &b [*a,*a,*a,*a,*a,*a,*a,*a,*a]\nc: &c [*b,*b,*b,*b,*b,*b,*b,*b,*b]\nd: &d [*c,*c,*c,*c,*c,*c,*c,*c,*c]\ne: [*d,*d,*d,*d,*d,*d,*d,*d,*d]\n---\n`;
    const t0 = Date.now();
    const ds = loadDesignSystem(bomb);
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(ds.diagnostics.length).toBeGreaterThan(0);
  });
  it("prototype-key token names are ordinary names", () => {
    const ds = loadDesignSystem("---\ncolors:\n  toString: red\n  constructor: blue\n---\n");
    expect(Object.hasOwn(ds.tokens.colors, "toString")).toBe(true);
    expect(lookup(ds.tokens, "colors.hasOwnProperty")).toBeUndefined();
  });
});

describe("token references", () => {
  const ds = loadDesignSystem(SAMPLE);
  it("recognises references", () => {
    expect(isRef("{colors.primary}")).toBe(true);
    expect(isRef("colors.primary")).toBe(false);
    expect(isRef("{a b}")).toBe(false);
  });
  it("resolves chains", () => {
    expect(resolveRef(ds.tokens, "{colors.link}")).toEqual({
      value: "#1A1C1E",
      chain: ["{colors.link}", "{colors.primary}"],
    });
    expect(resolveRef(ds.tokens, "plain").value).toBe("plain");
    expect(resolveRef(ds.tokens, "{typography.h1}").value).toMatchObject({
      fontFamily: "Public Sans",
    });
  });
  it("reports broken references and cycles", () => {
    expect(resolveRef(ds.tokens, "{colors.nope}").error).toBe("broken");
    expect(resolveRef(ds.tokens, "{colors.constructor}").error).toBe("broken");
    const cyc = loadDesignSystem(
      '---\ncolors:\n  a: "{colors.b}"\n  b: "{colors.a}"\n  c: "{colors.c}"\n---\n',
    );
    expect(resolveRef(cyc.tokens, "{colors.a}").error).toBe("cycle");
    expect(resolveRef(cyc.tokens, "{colors.c}").error).toBe("cycle");
  });
  it("sections ignore headings inside code fences", () => {
    expect(Object.keys(sections("## A\n```\n## not\n```\n## 🎨 B\n"))).toEqual(["A", "B"]);
  });
});
