/** Token exporters (T-038): DTCG 2025.10, Tailwind v3 JSON, Tailwind v4 `@theme`, CSS variables. */
import { parseColor, toHex, type Rgba } from "./color.js";
import {
  emptyTokens,
  isRef,
  resolveRef,
  type DesignSystem,
  type TokenValue,
  type Tokens,
  type Typography,
} from "./model.js";

export interface ExportReport {
  /** Things that could not be exported faithfully (unsupported color format, `em` in DTCG, broken refs…). */
  warnings: string[];
}

// ------------------------------------------------------------------------------------ helpers

interface Dim {
  value: number;
  unit: string;
}
function parseDim(v: TokenValue): Dim | undefined {
  if (typeof v === "number") return { value: v, unit: "px" };
  const m = /^(-?\d*\.?\d+)(px|em|rem)$/.exec(v);
  return m === null ? undefined : { value: Number(m[1]), unit: m[2] as string };
}

/** A token tree with every reference resolved to its final value; unresolved ones are kept and reported. */
export function resolveAll(ds: DesignSystem): { tokens: Tokens; warnings: string[] } {
  const warnings: string[] = [];
  const out = emptyTokens();
  const one = (path: string, v: TokenValue): TokenValue => {
    if (!isRef(v)) return v;
    const r = resolveRef(ds.tokens, v);
    if (r.error !== undefined || r.value === undefined || typeof r.value === "object") {
      warnings.push(
        `${path}: ${r.error === "cycle" ? "reference cycle" : r.value !== undefined && typeof r.value === "object" ? "reference to a composite token" : "broken reference"} ${v}`,
      );
      return v;
    }
    return r.value;
  };
  for (const [k, v] of Object.entries(ds.tokens.colors))
    out.colors[k] = one(`colors.${k}`, v) as string;
  for (const g of ["rounded", "spacing"] as const)
    for (const [k, v] of Object.entries(ds.tokens[g])) out[g][k] = one(`${g}.${k}`, v);
  for (const [k, t] of Object.entries(ds.tokens.typography)) {
    const c: Typography = {};
    for (const [p, v] of Object.entries(t))
      (c as Record<string, TokenValue>)[p] =
        typeof v === "string" ? one(`typography.${k}.${p}`, v) : v;
    out.typography[k] = c;
  }
  for (const [k, comp] of Object.entries(ds.tokens.components)) {
    const c: Record<string, TokenValue> = {};
    for (const [p, v] of Object.entries(comp)) {
      if (isRef(v)) {
        const r = resolveRef(ds.tokens, v);
        if (r.error === undefined && r.value !== undefined && typeof r.value !== "object")
          c[p] = r.value;
        else if (r.error !== undefined) {
          warnings.push(
            `components.${k}.${p}: ${r.error === "cycle" ? "reference cycle" : "broken reference"} ${v}`,
          );
          c[p] = v;
        } else c[p] = v; // composite (typography) stays a reference
      } else c[p] = v;
    }
    out.components[k] = c;
  }
  return { tokens: out, warnings };
}

// -------------------------------------------------------------------------------------- DTCG

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
type DtcgNode = { [k: string]: Json };

function dtcgColor(v: string, path: string, w: string[]): Json | undefined {
  if (isRef(v)) return v;
  const c = parseColor(v);
  if (c === undefined) {
    w.push(`${path}: unsupported color format "${v}" (not exported)`);
    return undefined;
  }
  const hex = /^#[0-9a-f]{6}$/i.test(v) ? v : toHex(c);
  const out: { [k: string]: Json } = {
    colorSpace: "srgb",
    components: [c.r / 255, c.g / 255, c.b / 255].map((x) => Math.round(x * 10000) / 10000),
    hex,
  };
  if (c.a < 1) out["alpha"] = Math.round(c.a * 1000) / 1000;
  return out;
}
function dtcgDim(v: TokenValue, path: string, w: string[]): Json | undefined {
  if (isRef(v)) return v;
  const d = parseDim(v);
  if (d === undefined) {
    w.push(`${path}: "${String(v)}" is not a dimension (not exported)`);
    return undefined;
  }
  if (d.unit !== "px" && d.unit !== "rem") {
    w.push(`${path}: unit "${d.unit}" is not a DTCG dimension unit (px, rem); not exported`);
    return undefined;
  }
  return { value: d.value, unit: d.unit };
}

/** Export to W3C Design Tokens Format (2025.10 value shapes). References stay `{path}` aliases. */
export function toDtcg(ds: DesignSystem): { file: DtcgNode; report: ExportReport } {
  const w: string[] = [];
  const file: DtcgNode = { $schema: "https://www.designtokens.org/schemas/2025.10/format.json" };
  if (ds.description !== undefined) file["$description"] = ds.description;
  const group = (name: string, type: string, entries: [string, Json | undefined][]): void => {
    const g: DtcgNode = { $type: type };
    for (const [k, v] of entries) if (v !== undefined) g[k] = { $value: v };
    if (Object.keys(g).length > 1) file[name] = g;
  };
  group(
    "colors",
    "color",
    Object.entries(ds.tokens.colors).map(([k, v]) => [k, dtcgColor(v, `colors.${k}`, w)]),
  );
  group(
    "rounded",
    "dimension",
    Object.entries(ds.tokens.rounded).map(([k, v]) => [k, dtcgDim(v, `rounded.${k}`, w)]),
  );
  group(
    "spacing",
    "dimension",
    Object.entries(ds.tokens.spacing).map(([k, v]) => [k, dtcgDim(v, `spacing.${k}`, w)]),
  );
  const typo: [string, Json | undefined][] = Object.entries(ds.tokens.typography).map(([k, t]) => {
    const v: { [k: string]: Json } = {};
    if (t.fontFamily !== undefined) v["fontFamily"] = t.fontFamily;
    if (t.fontSize !== undefined) {
      const d = dtcgDim(t.fontSize, `typography.${k}.fontSize`, w);
      if (d !== undefined) v["fontSize"] = d;
    }
    if (t.fontWeight !== undefined) v["fontWeight"] = t.fontWeight;
    if (t.letterSpacing !== undefined) {
      const d = dtcgDim(t.letterSpacing, `typography.${k}.letterSpacing`, w);
      if (d !== undefined) v["letterSpacing"] = d;
    }
    if (t.lineHeight !== undefined) {
      if (typeof t.lineHeight === "number") v["lineHeight"] = t.lineHeight;
      else {
        const lh = parseDim(t.lineHeight);
        const fs = t.fontSize === undefined ? undefined : parseDim(t.fontSize);
        if (lh !== undefined && fs !== undefined && lh.unit === fs.unit && fs.value !== 0)
          v["lineHeight"] = Math.round((lh.value / fs.value) * 1000) / 1000;
        else
          w.push(
            `typography.${k}.lineHeight: "${t.lineHeight}" cannot be expressed as a number without a matching fontSize (not exported)`,
          );
      }
    }
    return [k, Object.keys(v).length > 0 ? v : undefined];
  });
  group("typography", "typography", typo);
  // components: only props that are token references or colors/dimensions become tokens
  const comps: DtcgNode = {};
  for (const [name, props] of Object.entries(ds.tokens.components)) {
    const g: DtcgNode = {};
    for (const [p, v] of Object.entries(props)) {
      if (isRef(v)) {
        const target = /^\{([a-z]+)\./.exec(v)?.[1];
        const type =
          target === "colors"
            ? "color"
            : target === "typography"
              ? "typography"
              : target === "rounded" || target === "spacing"
                ? "dimension"
                : undefined;
        if (type !== undefined) g[p] = { $type: type, $value: v };
      } else if (typeof v === "string" && parseColor(v) !== undefined)
        g[p] = { $type: "color", $value: dtcgColor(v, `components.${name}.${p}`, w) ?? null };
    }
    if (Object.keys(g).length > 0) comps[name] = g;
  }
  if (Object.keys(comps).length > 0) file["components"] = comps;
  return { file, report: { warnings: w } };
}

/** Import a DTCG file produced by `toDtcg` (round trip): aliases survive as `{path}` references. */
export function fromDtcg(file: DtcgNode): Tokens {
  const t = emptyTokens();
  const val = (n: unknown): Json | undefined =>
    n !== null && typeof n === "object" && "$value" in (n as object)
      ? ((n as DtcgNode)["$value"] as Json)
      : undefined;
  const color = (v: Json | undefined): string | undefined => {
    if (typeof v === "string") return v;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      if (typeof v["hex"] === "string") return v["hex"];
      const c = v["components"];
      if (Array.isArray(c))
        return toHex({
          r: Number(c[0]) * 255,
          g: Number(c[1]) * 255,
          b: Number(c[2]) * 255,
          a: 1,
        } as Rgba);
    }
    return undefined;
  };
  const dim = (v: Json | undefined): string | undefined => {
    if (typeof v === "string") return v;
    if (
      v !== null &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      typeof v["value"] === "number" &&
      typeof v["unit"] === "string"
    )
      return `${v["value"]}${v["unit"]}`;
    return undefined;
  };
  const entries = (g: unknown): [string, unknown][] =>
    g !== null && typeof g === "object"
      ? Object.entries(g as DtcgNode).filter(([k]) => !k.startsWith("$"))
      : [];
  for (const [k, n] of entries(file["colors"])) {
    const c = color(val(n));
    if (c !== undefined) t.colors[k] = c;
  }
  for (const g of ["rounded", "spacing"] as const)
    for (const [k, n] of entries(file[g])) {
      const d = dim(val(n));
      if (d !== undefined) t[g][k] = d;
    }
  for (const [k, n] of entries(file["typography"])) {
    const v = val(n);
    if (v === null || typeof v !== "object" || Array.isArray(v)) continue;
    const ty: Typography = {};
    if (typeof v["fontFamily"] === "string") ty.fontFamily = v["fontFamily"];
    const fs = dim(v["fontSize"]);
    if (fs !== undefined) ty.fontSize = fs;
    if (typeof v["fontWeight"] === "number") ty.fontWeight = v["fontWeight"];
    const ls = dim(v["letterSpacing"]);
    if (ls !== undefined) ty.letterSpacing = ls;
    if (typeof v["lineHeight"] === "number") ty.lineHeight = v["lineHeight"];
    t.typography[k] = ty;
  }
  for (const [name, g] of entries(file["components"])) {
    const c: Record<string, TokenValue> = {};
    for (const [p, n] of entries(g)) {
      const v = val(n);
      const s = color(v) ?? dim(v);
      if (s !== undefined) c[p] = s;
    }
    t.components[name] = c;
  }
  return t;
}

const DTCG_TYPES = new Set([
  "color",
  "dimension",
  "fontFamily",
  "fontWeight",
  "duration",
  "cubicBezier",
  "number",
  "typography",
  "strokeStyle",
  "border",
  "transition",
  "shadow",
  "gradient",
]);
const TYPO_PROPS = new Set(["fontFamily", "fontSize", "fontWeight", "letterSpacing", "lineHeight"]);

/** Structural validation against the DTCG 2025.10 format (value shapes, names, types, alias targets, cycles). Returns problems. */
export function validateDtcg(file: DtcgNode): string[] {
  const problems: string[] = [];
  const tokens = new Map<string, { type: string | undefined; value: Json }>();
  const walk = (node: DtcgNode, path: string, inherited: string | undefined): void => {
    const type = typeof node["$type"] === "string" ? (node["$type"] as string) : inherited;
    if (
      node["$type"] !== undefined &&
      (typeof node["$type"] !== "string" || !DTCG_TYPES.has(node["$type"]))
    )
      problems.push(`${path || "(root)"}: unknown $type ${JSON.stringify(node["$type"])}`);
    if ("$value" in node) {
      tokens.set(path, { type, value: node["$value"] as Json });
      for (const k of Object.keys(node))
        if (!k.startsWith("$")) problems.push(`${path}: a token must not contain child "${k}"`);
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith("$")) continue;
      if (/[{}.]/.test(k))
        problems.push(
          `${path === "" ? k : `${path}.${k}`}: names must not contain "{", "}" or "."`,
        );
      if (v === null || typeof v !== "object" || Array.isArray(v))
        problems.push(`${path === "" ? k : `${path}.${k}`}: expected a group or token object`);
      else walk(v as DtcgNode, path === "" ? k : `${path}.${k}`, type);
    }
  };
  walk(file, "", undefined);
  const ALIAS = /^\{([^{}]+)\}$/;
  const checkValue = (path: string, type: string | undefined, v: Json): void => {
    if (typeof v === "string") {
      const m = ALIAS.exec(v);
      if (m === null) {
        if (type !== "fontFamily" && type !== "color")
          problems.push(`${path}: a string $value must be an alias like {colors.primary}`);
        return;
      }
      const target = tokens.get(m[1] as string);
      if (target === undefined) problems.push(`${path}: alias ${v} does not resolve`);
      else if (type !== undefined && target.type !== undefined && target.type !== type)
        problems.push(`${path}: alias ${v} has type ${target.type}, expected ${type}`);
      return;
    }
    switch (type) {
      case "color": {
        if (v === null || typeof v !== "object" || Array.isArray(v))
          return void problems.push(`${path}: color $value must be an object`);
        if (typeof v["colorSpace"] !== "string") problems.push(`${path}: color needs a colorSpace`);
        const c = v["components"];
        if (!Array.isArray(c) || c.length !== 3 || c.some((x) => typeof x !== "number"))
          problems.push(`${path}: color components must be three numbers`);
        if (v["hex"] !== undefined && !/^#[0-9a-f]{6}$/i.test(String(v["hex"])))
          problems.push(`${path}: hex must be #rrggbb`);
        break;
      }
      case "dimension":
        if (
          v === null ||
          typeof v !== "object" ||
          Array.isArray(v) ||
          typeof v["value"] !== "number" ||
          !["px", "rem"].includes(String(v["unit"]))
        )
          problems.push(`${path}: dimension must be {value:number, unit:"px"|"rem"}`);
        break;
      case "typography": {
        if (v === null || typeof v !== "object" || Array.isArray(v))
          return void problems.push(`${path}: typography $value must be an object`);
        for (const [k, x] of Object.entries(v)) {
          if (!TYPO_PROPS.has(k)) problems.push(`${path}: unknown typography property ${k}`);
          if (k === "fontSize" || k === "letterSpacing") checkValue(`${path}.${k}`, "dimension", x);
          if (k === "lineHeight" && typeof x !== "number")
            problems.push(`${path}.lineHeight must be a number`);
        }
        break;
      }
      default:
        break;
    }
  };
  for (const [path, t] of tokens) {
    if (t.type === undefined) problems.push(`${path}: token has no $type (own or inherited)`);
    checkValue(path, t.type, t.value);
  }
  // alias cycles
  for (const [path, t] of tokens) {
    const seen = new Set<string>([path]);
    let cur: Json = t.value;
    while (typeof cur === "string" && ALIAS.test(cur)) {
      const p = (ALIAS.exec(cur) as RegExpExecArray)[1] as string;
      if (seen.has(p)) {
        problems.push(`${path}: alias cycle through ${p}`);
        break;
      }
      seen.add(p);
      cur = tokens.get(p)?.value ?? null;
    }
  }
  return problems;
}

// ----------------------------------------------------------------------------------- Tailwind / CSS

const family = (f: string): string[] =>
  f
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);

/** Tailwind v3 `theme.extend` JSON. */
export function toTailwind3(ds: DesignSystem): {
  config: { theme: { extend: Record<string, Record<string, unknown>> } };
  report: ExportReport;
} {
  const { tokens: t, warnings } = resolveAll(ds);
  const extend: Record<string, Record<string, unknown>> = {};
  if (Object.keys(t.colors).length > 0) extend["colors"] = { ...t.colors };
  if (Object.keys(t.rounded).length > 0)
    extend["borderRadius"] = Object.fromEntries(
      Object.entries(t.rounded).map(([k, v]) => [k, typeof v === "number" ? `${v}px` : v]),
    );
  if (Object.keys(t.spacing).length > 0)
    extend["spacing"] = Object.fromEntries(
      Object.entries(t.spacing).map(([k, v]) => [k, typeof v === "number" ? `${v}px` : v]),
    );
  const fonts: Record<string, unknown> = {};
  const sizes: Record<string, unknown> = {};
  for (const [k, ty] of Object.entries(t.typography)) {
    if (ty.fontFamily !== undefined) fonts[k] = family(ty.fontFamily);
    if (ty.fontSize !== undefined) {
      const o: Record<string, unknown> = {};
      if (ty.lineHeight !== undefined) o["lineHeight"] = String(ty.lineHeight);
      if (ty.letterSpacing !== undefined) o["letterSpacing"] = String(ty.letterSpacing);
      if (ty.fontWeight !== undefined) o["fontWeight"] = String(ty.fontWeight);
      sizes[k] = [typeof ty.fontSize === "number" ? `${ty.fontSize}px` : ty.fontSize, o];
    }
  }
  if (Object.keys(fonts).length > 0) extend["fontFamily"] = fonts;
  if (Object.keys(sizes).length > 0) extend["fontSize"] = sizes;
  return { config: { theme: { extend } }, report: { warnings } };
}

const px = (v: TokenValue): string => (typeof v === "number" ? `${v}px` : v);

/** Tailwind v4 CSS-first `@theme` block (namespaces: --color-*, --font-*, --text-*, --radius-*, --spacing-*). */
export function toTailwind4(ds: DesignSystem): { css: string; report: ExportReport } {
  const { tokens: t, warnings } = resolveAll(ds);
  const l: string[] = [];
  for (const [k, v] of Object.entries(t.colors)) l.push(`  --color-${k}: ${v};`);
  for (const [k, ty] of Object.entries(t.typography)) {
    if (ty.fontFamily !== undefined)
      l.push(
        `  --font-${k}: ${family(ty.fontFamily)
          .map((f) => (/\s/.test(f) ? `"${f}"` : f))
          .join(", ")};`,
      );
    if (ty.fontSize !== undefined) l.push(`  --text-${k}: ${px(ty.fontSize)};`);
    if (ty.lineHeight !== undefined) l.push(`  --text-${k}--line-height: ${ty.lineHeight};`); // unitless numbers stay unitless
    if (ty.letterSpacing !== undefined)
      l.push(`  --text-${k}--letter-spacing: ${px(ty.letterSpacing)};`);
    if (ty.fontWeight !== undefined) l.push(`  --text-${k}--font-weight: ${ty.fontWeight};`);
  }
  for (const [k, v] of Object.entries(t.rounded)) l.push(`  --radius-${k}: ${px(v)};`);
  for (const [k, v] of Object.entries(t.spacing)) l.push(`  --spacing-${k}: ${px(v)};`);
  return { css: `@theme {\n${l.join("\n")}\n}\n`, report: { warnings } };
}

/** Plain CSS custom properties on `:root`. */
export function toCssVars(ds: DesignSystem): { css: string; report: ExportReport } {
  const { tokens: t, warnings } = resolveAll(ds);
  const l: string[] = [];
  for (const [k, v] of Object.entries(t.colors)) l.push(`  --colors-${k}: ${v};`);
  for (const [k, ty] of Object.entries(t.typography))
    for (const [p, v] of Object.entries(ty))
      l.push(
        `  --typography-${k}-${p.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}: ${typeof v === "number" && p !== "fontWeight" && p !== "lineHeight" ? `${v}px` : v};`,
      );
  for (const [k, v] of Object.entries(t.rounded)) l.push(`  --rounded-${k}: ${px(v)};`);
  for (const [k, v] of Object.entries(t.spacing)) l.push(`  --spacing-${k}: ${px(v)};`);
  return { css: `:root {\n${l.join("\n")}\n}\n`, report: { warnings } };
}
