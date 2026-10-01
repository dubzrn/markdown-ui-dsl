/** CSS color parsing and WCAG 2.x contrast (hex, rgb[a], hsl[a], a few names). Anything else is "unsupported", never a guess. */

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const NAMED: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  red: "#ff0000",
  green: "#008000",
  blue: "#0000ff",
  yellow: "#ffff00",
  gray: "#808080",
  grey: "#808080",
  silver: "#c0c0c0",
  maroon: "#800000",
  purple: "#800080",
  fuchsia: "#ff00ff",
  lime: "#00ff00",
  olive: "#808000",
  navy: "#000080",
  teal: "#008080",
  aqua: "#00ffff",
  orange: "#ffa500",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  pink: "#ffc0cb",
  brown: "#a52a2a",
  gold: "#ffd700",
  indigo: "#4b0082",
  violet: "#ee82ee",
  cornflowerblue: "#6495ed",
  tomato: "#ff6347",
  rebeccapurple: "#663399",
  transparent: "#00000000",
};

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

function hex(s: string): Rgba | undefined {
  const m = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(s);
  if (m === null) return undefined;
  let h = m[1] as string;
  if (h.length <= 4) h = [...h].map((c) => c + c).join("");
  const n = (i: number): number => Number.parseInt(h.slice(i, i + 2), 16);
  return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
}

function parts(args: string): string[] {
  return args
    .trim()
    .split(/[\s,/]+/)
    .filter((x) => x !== "");
}

const pct = (v: string, max: number): number =>
  v.endsWith("%") ? (Number.parseFloat(v) / 100) * max : Number.parseFloat(v);

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number): number => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): number => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

/** Parse a CSS color string, or `undefined` when the format is not supported here (oklch, color-mix, …). */
export function parseColor(input: string): Rgba | undefined {
  const s = input.trim().toLowerCase();
  const h = hex(s);
  if (h !== undefined) return h;
  const named = NAMED[s];
  if (named !== undefined) return hex(named);
  const fn = /^(rgba?|hsla?)\(([^)]*)\)$/.exec(s);
  if (fn === null) return undefined;
  const p = parts(fn[2] as string);
  if (p.length < 3 || p.length > 4 || p.slice(0, 3).some((x) => Number.isNaN(Number.parseFloat(x))))
    return undefined;
  const alpha = p[3] === undefined ? 1 : clamp(pct(p[3], 1), 0, 1);
  if ((fn[1] as string).startsWith("rgb"))
    return {
      r: clamp(pct(p[0] as string, 255), 0, 255),
      g: clamp(pct(p[1] as string, 255), 0, 255),
      b: clamp(pct(p[2] as string, 255), 0, 255),
      a: alpha,
    };
  const [r, g, b] = hslToRgb(
    ((Number.parseFloat(p[0] as string) % 360) + 360) % 360,
    clamp(pct(p[1] as string, 1), 0, 1),
    clamp(pct(p[2] as string, 1), 0, 1),
  );
  return { r, g, b, a: alpha };
}

/** WCAG 2.x relative luminance. */
export function luminance(c: Rgba): number {
  const f = (v: number): number => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}

/** WCAG contrast ratio (1…21) between two opaque colors. */
export function contrastRatio(a: Rgba, b: Rgba): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

export const toHex = (c: Rgba): string =>
  `#${[c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
