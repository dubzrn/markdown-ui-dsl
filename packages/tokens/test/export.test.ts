import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  fromDtcg,
  loadDesignSystem,
  resolveAll,
  toCssVars,
  toDtcg,
  toTailwind3,
  toTailwind4,
  validateDtcg,
} from "../src/index.js";

const SAMPLE = `---
name: Heritage
description: Editorial
colors:
  primary: "#1A1C1E"
  secondary: "#6C7278"
  link: "{colors.primary}"
  wash: "rgb(255 0 0 / 50%)"
typography:
  h1:
    fontFamily: Public Sans
    fontSize: 3rem
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: 0px
  body:
    fontFamily: "Inter, system-ui"
    fontSize: 16px
    lineHeight: 24px
rounded:
  sm: 4px
  pill: 999px
spacing:
  md: 16px
  gutter: 24
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    typography: "{typography.h1}"
---
`;
const ds = loadDesignSystem(SAMPLE);

describe("DTCG export (T-038)", () => {
  const { file, report } = toDtcg(ds);
  it("uses the 2025.10 value shapes and keeps references as aliases", () => {
    expect(file["colors"]).toMatchObject({
      $type: "color",
      primary: { $value: { colorSpace: "srgb", hex: "#1A1C1E" } },
      link: { $value: "{colors.primary}" },
      wash: { $value: { colorSpace: "srgb", alpha: 0.5 } },
    });
    expect(file["spacing"]).toMatchObject({
      md: { $value: { value: 16, unit: "px" } },
      gutter: { $value: { value: 24, unit: "px" } },
    });
    expect(file["typography"]).toMatchObject({
      h1: {
        $value: {
          fontFamily: "Public Sans",
          fontSize: { value: 3, unit: "rem" },
          fontWeight: 600,
          lineHeight: 1.1,
        },
      },
    });
    // 24px / 16px ⇒ unitless 1.5
    expect(file["typography"]).toMatchObject({ body: { $value: { lineHeight: 1.5 } } });
    expect(file["components"]).toMatchObject({
      "button-primary": {
        backgroundColor: { $type: "color", $value: "{colors.primary}" },
        typography: { $type: "typography", $value: "{typography.h1}" },
        textColor: { $type: "color" },
      },
    });
  });
  it("validates against the DTCG format", () => {
    expect(validateDtcg(file)).toEqual([]);
    expect(report.warnings).toEqual([]);
  });
  it("round trip preserves references and values", () => {
    const back = fromDtcg(JSON.parse(JSON.stringify(file)));
    expect(back.colors["link"]).toBe("{colors.primary}");
    expect(back.colors["primary"]).toBe("#1A1C1E");
    expect(back.spacing["md"]).toBe("16px");
    expect(back.spacing["gutter"]).toBe("24px"); // unitless numbers are px in DTCG
    expect(back.typography["h1"]).toMatchObject({
      fontSize: "3rem",
      fontWeight: 600,
      lineHeight: 1.1,
    });
    expect(back.components["button-primary"]?.["backgroundColor"]).toBe("{colors.primary}");
    expect(back.components["button-primary"]?.["typography"]).toBe("{typography.h1}"); // composite aliases survive too
  });
  it("reports what it cannot export", () => {
    const odd = loadDesignSystem(
      '---\ncolors:\n  a: "oklch(0.6 0.2 30)"\nspacing:\n  e: 1.5em\n---\n',
    );
    const r = toDtcg(odd);
    expect(r.report.warnings.length).toBe(2);
    expect(r.file["colors"]).toBeUndefined();
    expect(validateDtcg(r.file)).toEqual([]);
  });
  it("the validator is not vacuous", () => {
    const bad = validateDtcg({
      colors: {
        $type: "color",
        a: { $value: { colorSpace: "srgb", components: [1, 1] } },
        b: { $value: "{colors.nope}" },
        "c.d": { $value: { colorSpace: "srgb", components: [0, 0, 0] } },
      },
      sp: { $type: "dimension", x: { $value: { value: 1, unit: "em" } } },
      loop: { $type: "color", p: { $value: "{loop.q}" }, q: { $value: "{loop.p}" } },
      noType: { t: { $value: 1 } },
      weird: { $type: "nonsense", z: { $value: 1 } },
    } as never);
    expect(bad.join("\n")).toMatch(/three numbers/);
    expect(bad.join("\n")).toMatch(/does not resolve/);
    expect(bad.join("\n")).toMatch(/names must not contain/);
    expect(bad.join("\n")).toMatch(/dimension must be/);
    expect(bad.join("\n")).toMatch(/alias cycle/);
    expect(bad.join("\n")).toMatch(/no \$type/);
    expect(bad.join("\n")).toMatch(/unknown \$type/);
  });
  it.skipIf(!existsSync(new URL("../../../reference/tokens/design-md/examples/", import.meta.url)))(
    "exports the upstream sample design systems to valid DTCG",
    () => {
      const base = new URL("../../../reference/tokens/design-md/examples/", import.meta.url);
      for (const d of readdirSync(base)) {
        const sample = loadDesignSystem(readFileSync(new URL(`${d}/DESIGN.md`, base), "utf8"));
        expect(validateDtcg(toDtcg(sample).file), d).toEqual([]);
      }
    },
  );
});

describe("Tailwind and CSS exports", () => {
  it("Tailwind v3 theme.extend", () => {
    const { config } = toTailwind3(ds);
    expect(config.theme.extend["colors"]).toMatchObject({ primary: "#1A1C1E", link: "#1A1C1E" });
    expect(config.theme.extend["borderRadius"]).toEqual({ sm: "4px", pill: "999px" });
    expect(config.theme.extend["spacing"]).toEqual({ md: "16px", gutter: "24px" });
    expect(config.theme.extend["fontFamily"]).toMatchObject({
      h1: ["Public Sans"],
      body: ["Inter", "system-ui"],
    });
    expect(config.theme.extend["fontSize"]).toMatchObject({
      h1: ["3rem", { lineHeight: "1.1", fontWeight: "600" }],
    });
  });
  it("Tailwind v4 @theme", () => {
    expect(toTailwind4(ds).css).toBe(`@theme {
  --color-primary: #1A1C1E;
  --color-secondary: #6C7278;
  --color-link: #1A1C1E;
  --color-wash: rgb(255 0 0 / 50%);
  --font-h1: "Public Sans";
  --text-h1: 3rem;
  --text-h1--line-height: 1.1;
  --text-h1--letter-spacing: 0px;
  --text-h1--font-weight: 600;
  --font-body: Inter, system-ui;
  --text-body: 16px;
  --text-body--line-height: 24px;
  --radius-sm: 4px;
  --radius-pill: 999px;
  --spacing-md: 16px;
  --spacing-gutter: 24px;
}
`);
  });
  it("CSS variables", () => {
    const css = toCssVars(ds).css;
    expect(css.startsWith(":root {")).toBe(true);
    expect(css).toContain("--colors-primary: #1A1C1E;");
    expect(css).toContain("--typography-h1-font-size: 3rem;");
    expect(css).toContain("--spacing-gutter: 24px;");
  });
  it("resolveAll flattens references and reports broken ones", () => {
    const r = resolveAll(
      loadDesignSystem('---\ncolors:\n  a: "{colors.b}"\n  b: "#fff"\n  c: "{colors.zzz}"\n---\n'),
    );
    expect(r.tokens.colors["a"]).toBe("#fff");
    expect(r.warnings).toEqual(["colors.c: broken reference {colors.zzz}"]);
  });
});
