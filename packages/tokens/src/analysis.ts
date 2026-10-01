/** Design-system checks (T-039) and token diff. Pure functions over a loaded `DesignSystem`. */
import { contrastRatio, parseColor } from "./color.js";
import { isRef, lookup, resolveRef, type DesignSystem, type TokenValue } from "./model.js";

export interface TokenFinding {
  code: "E4001" | "W4002" | "I4003" | "W4004" | "W4005";
  message: string;
  path: string;
  line: number;
}

const GROUP_PATHS = (ds: DesignSystem): [string, TokenValue][] => {
  const out: [string, TokenValue][] = [];
  for (const [k, v] of Object.entries(ds.tokens.colors)) out.push([`colors.${k}`, v]);
  for (const g of ["rounded", "spacing"] as const)
    for (const [k, v] of Object.entries(ds.tokens[g])) out.push([`${g}.${k}`, v]);
  for (const [k, t] of Object.entries(ds.tokens.typography))
    for (const [p, v] of Object.entries(t)) out.push([`typography.${k}.${p}`, v as TokenValue]);
  for (const [k, c] of Object.entries(ds.tokens.components))
    for (const [p, v] of Object.entries(c)) out.push([`components.${k}.${p}`, v]);
  return out;
};

const lineOf = (ds: DesignSystem, path: string): number => ds.lines[path] ?? 2;

/** E4001: every `{ref}` resolves, without cycles. */
export function checkRefs(ds: DesignSystem): TokenFinding[] {
  const out: TokenFinding[] = [];
  for (const [path, v] of GROUP_PATHS(ds)) {
    if (!isRef(v)) continue;
    const r = resolveRef(ds.tokens, v);
    if (r.error === "broken")
      out.push({
        code: "E4001",
        message: `Reference ${r.chain[r.chain.length - 1]} does not exist.`,
        path,
        line: lineOf(ds, path),
      });
    else if (r.error === "cycle")
      out.push({
        code: "E4001",
        message: `Reference cycle: ${r.chain.join(" → ")}.`,
        path,
        line: lineOf(ds, path),
      });
  }
  return out;
}

const colorOf = (ds: DesignSystem, v: TokenValue | undefined) => {
  if (typeof v !== "string") return undefined;
  const r = resolveRef(ds.tokens, v);
  const val = r.error === undefined ? r.value : undefined;
  return typeof val === "string" ? { text: val, rgba: parseColor(val) } : undefined;
};

export interface ContrastPair {
  component: string;
  background: string;
  text: string;
  ratio: number;
}

/** Component background/text pairs with their contrast ratio (opaque, parseable colors only). */
export function contrastPairs(ds: DesignSystem): ContrastPair[] {
  const out: ContrastPair[] = [];
  for (const [name, c] of Object.entries(ds.tokens.components)) {
    const bg = colorOf(ds, c["backgroundColor"]);
    const fg = colorOf(ds, c["textColor"]);
    if (bg?.rgba === undefined || fg?.rgba === undefined || bg.rgba.a < 1 || fg.rgba.a < 1)
      continue;
    out.push({
      component: name,
      background: bg.text,
      text: fg.text,
      ratio: contrastRatio(bg.rgba, fg.rgba),
    });
  }
  return out;
}

/** W4002: component text/background pairs below WCAG AA for normal text (4.5:1). */
export function checkContrast(ds: DesignSystem): TokenFinding[] {
  return contrastPairs(ds)
    .filter((p) => p.ratio < 4.5)
    .map((p) => ({
      code: "W4002" as const,
      message: `components.${p.component}: textColor ${p.text} on backgroundColor ${p.background} has contrast ${p.ratio.toFixed(2)}:1; WCAG AA needs 4.5:1.`,
      path: `components.${p.component}.textColor`,
      line: lineOf(ds, `components.${p.component}.textColor`),
    }));
}

/** I4003: color tokens that nothing references (only when components exist to reference them). */
export function checkOrphans(ds: DesignSystem): TokenFinding[] {
  if (Object.keys(ds.tokens.components).length === 0) return [];
  const used = new Set<string>();
  for (const [, v] of GROUP_PATHS(ds)) {
    let cur: unknown = v;
    const seen = new Set<string>();
    while (isRef(cur)) {
      const p = cur.slice(1, -1);
      if (seen.has(p)) break;
      seen.add(p);
      used.add(p);
      cur = lookup(ds.tokens, p);
    }
  }
  return Object.keys(ds.tokens.colors)
    .filter((k) => !used.has(`colors.${k}`))
    .map((k) => ({
      code: "I4003" as const,
      message: `Color "${k}" is defined but never referenced by a component or another token.`,
      path: `colors.${k}`,
      line: lineOf(ds, `colors.${k}`),
    }));
}

const KNOWN_BP = ["sm", "md", "lg", "xl"];
/** W4004: declared breakpoints must be the DSL's sm/md/lg/xl, with ascending widths. */
export function checkBreakpoints(ds: DesignSystem): TokenFinding[] {
  const bp = ds.mdui.breakpoints;
  if (bp === undefined) return [];
  const out: TokenFinding[] = [];
  for (const k of Object.keys(bp))
    if (!KNOWN_BP.includes(k))
      out.push({
        code: "W4004",
        message: `Breakpoint "${k}" is unknown: responsive directives only support ${KNOWN_BP.join(", ")}.`,
        path: `mdui.breakpoints.${k}`,
        line: lineOf(ds, `mdui.breakpoints.${k}`),
      });
  const widths = KNOWN_BP.filter((k) => Object.hasOwn(bp, k)).map(
    (k) => [k, Number.parseFloat(bp[k] as string)] as const,
  );
  for (let i = 1; i < widths.length; i++) {
    const [pk, pw] = widths[i - 1] as readonly [string, number];
    const [k, w] = widths[i] as readonly [string, number];
    if (Number.isNaN(w) || w <= pw)
      out.push({
        code: "W4004",
        message: `Breakpoint "${k}" (${bp[k]}) must be wider than "${pk}" (${bp[pk]}).`,
        path: `mdui.breakpoints.${k}`,
        line: lineOf(ds, `mdui.breakpoints.${k}`),
      });
  }
  return out;
}

/** W4005: a DESIGN.md defines a `primary` color. */
export function checkPrimary(ds: DesignSystem): TokenFinding[] {
  if (ds.kind !== "design.md") return [];
  return Object.hasOwn(ds.tokens.colors, "primary")
    ? []
    : [
        {
          code: "W4005",
          message: "No `colors.primary`: the DESIGN.md spec requires at least a primary color.",
          path: "colors",
          line: lineOf(ds, "colors"),
        },
      ];
}

// ------------------------------------------------------------------------------------------ diff

export interface TokenDelta {
  op: "added" | "removed" | "changed";
  path: string;
  before?: string;
  after?: string;
}
export interface TokenDiff {
  deltas: TokenDelta[];
  summary: { added: number; removed: number; changed: number };
  /** A removed token, or a component pair whose contrast newly fails AA. */
  regressions: string[];
}

const flat = (ds: DesignSystem): Map<string, string> =>
  new Map(GROUP_PATHS(ds).map(([p, v]) => [p, String(v)]));

export function diffTokens(a: DesignSystem, b: DesignSystem): TokenDiff {
  const fa = flat(a);
  const fb = flat(b);
  const deltas: TokenDelta[] = [];
  for (const [p, v] of fa) {
    if (!fb.has(p)) deltas.push({ op: "removed", path: p, before: v });
    else if (fb.get(p) !== v)
      deltas.push({ op: "changed", path: p, before: v, after: fb.get(p) as string });
  }
  for (const [p, v] of fb) if (!fa.has(p)) deltas.push({ op: "added", path: p, after: v });
  deltas.sort((x, y) => x.path.localeCompare(y.path));
  const summary = { added: 0, removed: 0, changed: 0 };
  for (const d of deltas) summary[d.op]++;
  const regressions = deltas
    .filter((d) => d.op === "removed")
    .map((d) => `token removed: ${d.path}`);
  const failed = (ds: DesignSystem): Set<string> => new Set(checkContrast(ds).map((f) => f.path));
  const before = failed(a);
  for (const p of failed(b)) if (!before.has(p)) regressions.push(`contrast newly fails AA: ${p}`);
  return { deltas, summary, regressions };
}

export function formatTokenDiff(d: TokenDiff): string {
  const lines = d.deltas.map((x) =>
    x.op === "added"
      ? `+ ${x.path} = ${x.after}`
      : x.op === "removed"
        ? `- ${x.path} (was ${x.before})`
        : `~ ${x.path}: ${x.before} → ${x.after}`,
  );
  lines.push(
    `${d.summary.added} added, ${d.summary.removed} removed, ${d.summary.changed} changed`,
  );
  for (const r of d.regressions) lines.push(`REGRESSION: ${r}`);
  return lines.join("\n") + "\n";
}
