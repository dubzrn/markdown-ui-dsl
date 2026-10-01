/** Design-system loader (T-037): Google DESIGN.md (YAML front matter + prose) and legacy prose-only design systems. */
import { LineCounter, isMap, isPair, isScalar, parseDocument, type Node, type Pair } from "yaml";

/** DESIGN.md spec version this loader is written against (docs/spec.md of reference/tokens/design-md says "alpha"). */
export const SUPPORTED_DESIGN_MD_VERSIONS = ["alpha"] as const;

export type TokenValue = string | number;
export interface Typography {
  fontFamily?: string;
  fontSize?: TokenValue;
  fontWeight?: number;
  lineHeight?: TokenValue;
  letterSpacing?: TokenValue;
  fontFeature?: string;
  fontVariation?: string;
}
export interface Tokens {
  colors: Record<string, string>;
  typography: Record<string, Typography>;
  rounded: Record<string, TokenValue>;
  spacing: Record<string, TokenValue>;
  components: Record<string, Record<string, TokenValue>>;
}
export interface MduiExtension {
  /** Breakpoint name → min width, e.g. `{ sm: "640px" }` (powers the `unknown-breakpoint` rule). */
  breakpoints?: Record<string, string>;
  framework?: string;
}
export type DsCode = "E4101" | "W4101" | "W4102" | "E4103" | "E4104" | "W4105";
export interface DsDiagnostic {
  code: DsCode;
  severity: "error" | "warn";
  message: string;
  /** Token path, e.g. `colors.primary`. */
  path?: string;
  line: number;
}
export interface DesignSystem {
  /** `design.md` has YAML tokens; `legacy` is a prose-only file kept working as-is. */
  kind: "design.md" | "legacy";
  version?: string;
  name?: string;
  description?: string;
  tokens: Tokens;
  mdui: MduiExtension;
  /** `##` heading → body text. */
  prose: Record<string, string>;
  /** Token path → 1-based source line (for diagnostics). */
  lines: Record<string, number>;
  diagnostics: DsDiagnostic[];
}

export const emptyTokens = (): Tokens => ({
  colors: {},
  typography: {},
  rounded: {},
  spacing: {},
  components: {},
});
const GROUPS = ["colors", "typography", "rounded", "spacing", "components"] as const;
const TOP_KEYS = new Set(["version", "name", "description", "omitted", "mdui", ...GROUPS]);
const TYPO_KEYS = new Set([
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "fontFeature",
  "fontVariation",
]);
const DIMENSION = /^-?\d*\.?\d+(px|em|rem)$/;

function splitFrontMatter(src: string): {
  yaml: string | undefined;
  body: string;
  bodyLine: number;
} {
  const lines = src.split("\n");
  if (!/^---\s*$/.test(lines[0] ?? "")) return { yaml: undefined, body: src, bodyLine: 1 };
  const end = lines.findIndex((l, i) => i > 0 && /^---\s*$/.test(l));
  if (end === -1) return { yaml: undefined, body: src, bodyLine: 1 };
  return {
    yaml: lines.slice(1, end).join("\n"),
    body: lines.slice(end + 1).join("\n"),
    bodyLine: end + 2,
  };
}

/** `##` sections of the prose body (ignores headings inside code fences). */
export function sections(body: string): Record<string, string> {
  const out: Record<string, string> = Object.create(null) as Record<string, string>;
  let cur: string | undefined;
  let fence = false;
  const buf: string[] = [];
  const flush = (): void => {
    if (cur !== undefined) out[cur] = buf.join("\n").trim();
    buf.length = 0;
  };
  for (const l of body.split("\n")) {
    if (/^\s*```/.test(l)) fence = !fence;
    const m = fence ? null : /^##\s+(.+?)\s*$/.exec(l);
    if (m !== null) {
      flush();
      cur = (m[1] as string).replace(/^[^\p{L}\p{N}]+/u, "").trim();
    } else buf.push(l);
  }
  flush();
  return out;
}

/** Path → line for every key in the YAML tree. */
function lineMap(root: Node | null, lc: LineCounter, baseLine: number): Record<string, number> {
  const out: Record<string, number> = Object.create(null) as Record<string, number>;
  const walk = (node: unknown, prefix: string): void => {
    if (!isMap(node)) return;
    for (const item of node.items as Pair[]) {
      if (!isPair(item) || !isScalar(item.key)) continue;
      const key = String(item.key.value);
      const path = prefix === "" ? key : `${prefix}.${key}`;
      const off = item.key.range?.[0];
      out[path] = off === undefined ? baseLine : lc.linePos(off).line + baseLine - 1;
      walk(item.value, path);
    }
  };
  walk(root, "");
  return out;
}

/** Load a design system. Never throws: problems become diagnostics, and a failed parse yields an empty token set. */
export function loadDesignSystem(source: string): DesignSystem {
  const src = source.replace(/\r\n/g, "\n");
  const { yaml, body, bodyLine } = splitFrontMatter(src);
  const ds: DesignSystem = {
    kind: yaml === undefined ? "legacy" : "design.md",
    tokens: emptyTokens(),
    mdui: {},
    prose: sections(body),
    lines: Object.create(null) as Record<string, number>,
    diagnostics: [],
  };
  void bodyLine;
  if (yaml === undefined) return ds;

  const lc = new LineCounter();
  const doc = parseDocument(yaml, {
    lineCounter: lc,
    schema: "core",
    uniqueKeys: true,
  });
  if (doc.errors.length > 0) {
    for (const e of doc.errors)
      ds.diagnostics.push({
        code: "E4101",
        severity: "error",
        message: `YAML: ${e.message.split("\n")[0]}`,
        line: (e.linePos?.[0]?.line ?? 1) + 1,
      });
    return ds;
  }
  ds.lines = lineMap(doc.contents as Node | null, lc, 2);
  let raw: unknown;
  try {
    raw = doc.toJS({ maxAliasCount: 50 });
  } catch (e) {
    ds.diagnostics.push({
      code: "E4101",
      severity: "error",
      message: `YAML: ${e instanceof Error ? e.message : String(e)}`,
      line: 2,
    });
    return ds;
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    ds.diagnostics.push({
      code: "E4103",
      severity: "error",
      message: "Front matter must be a YAML mapping.",
      line: 2,
    });
    return ds;
  }
  const r = raw as Record<string, unknown>;
  const line = (p: string): number => ds.lines[p] ?? 2;
  const warn = (code: DsCode, severity: "error" | "warn", message: string, path: string): void =>
    void ds.diagnostics.push({ code, severity, message, path, line: line(path) });

  for (const k of Object.keys(r))
    if (!TOP_KEYS.has(k)) warn("W4102", "warn", `Unknown top-level key "${k}".`, k);
  if (r["version"] !== undefined) {
    ds.version = String(r["version"]);
    if (!(SUPPORTED_DESIGN_MD_VERSIONS as readonly string[]).includes(ds.version))
      warn(
        "W4101",
        "warn",
        `DESIGN.md version "${ds.version}" is not "${SUPPORTED_DESIGN_MD_VERSIONS.join('", "')}"; loading best-effort.`,
        "version",
      );
  }
  if (typeof r["name"] === "string") ds.name = r["name"];
  if (typeof r["description"] === "string") ds.description = r["description"];

  const group = (g: (typeof GROUPS)[number]): Record<string, unknown> | undefined => {
    const v = r[g];
    if (v === undefined || v === null) return undefined;
    if (typeof v !== "object" || Array.isArray(v)) {
      warn("E4103", "error", `\`${g}\` must be a mapping of token name → value.`, g);
      return undefined;
    }
    return v as Record<string, unknown>;
  };

  for (const [name, v] of Object.entries(group("colors") ?? {})) {
    if (typeof v !== "string")
      warn("E4104", "error", `Color "${name}" must be a string.`, `colors.${name}`);
    else ds.tokens.colors[name] = v;
  }
  for (const g of ["rounded", "spacing"] as const)
    for (const [name, v] of Object.entries(group(g) ?? {})) {
      if (typeof v === "number") ds.tokens[g][name] = v;
      else if (typeof v === "string") {
        ds.tokens[g][name] = v;
        if (!DIMENSION.test(v) && !/^\{[^}]+\}$/.test(v))
          warn("W4105", "warn", `"${v}" is not a dimension (px, em, rem).`, `${g}.${name}`);
      } else warn("E4104", "error", `${g}.${name} must be a dimension or number.`, `${g}.${name}`);
    }
  for (const [name, v] of Object.entries(group("typography") ?? {})) {
    if (v === null || typeof v !== "object" || Array.isArray(v)) {
      warn("E4103", "error", `Typography "${name}" must be a mapping.`, `typography.${name}`);
      continue;
    }
    const t: Typography = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (!TYPO_KEYS.has(k)) {
        warn("W4102", "warn", `Unknown typography property "${k}".`, `typography.${name}.${k}`);
        continue;
      }
      if (k === "fontWeight") {
        const n = typeof x === "number" ? x : Number(x);
        if (Number.isNaN(n))
          warn("E4104", "error", `fontWeight must be a number.`, `typography.${name}.${k}`);
        else t.fontWeight = n;
      } else if (typeof x === "string" || typeof x === "number")
        (t as Record<string, TokenValue>)[k] = x;
      else warn("E4104", "error", `${k} must be text or a number.`, `typography.${name}.${k}`);
    }
    ds.tokens.typography[name] = t;
  }
  for (const [name, v] of Object.entries(group("components") ?? {})) {
    if (v === null || typeof v !== "object" || Array.isArray(v)) {
      warn("E4103", "error", `Component "${name}" must be a mapping.`, `components.${name}`);
      continue;
    }
    const c: Record<string, TokenValue> = Object.create(null) as Record<string, TokenValue>;
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (typeof x === "string" || typeof x === "number") c[k] = x;
      else warn("E4104", "error", `${k} must be text or a number.`, `components.${name}.${k}`);
    }
    ds.tokens.components[name] = c;
  }

  // mdui: extension block (breakpoints, framework mapping)
  const ext = r["mdui"];
  if (ext !== undefined && ext !== null && typeof ext === "object" && !Array.isArray(ext)) {
    const e = ext as Record<string, unknown>;
    if (typeof e["framework"] === "string") ds.mdui.framework = e["framework"];
    if (e["breakpoints"] !== null && typeof e["breakpoints"] === "object") {
      ds.mdui.breakpoints = Object.create(null) as Record<string, string>;
      for (const [k, v] of Object.entries(e["breakpoints"] as Record<string, unknown>))
        ds.mdui.breakpoints[k] = String(v);
    }
  }
  return ds;
}

// ----------------------------------------------------------------------------------- references

const REF = /^\{([A-Za-z0-9_.-]+)\}$/;
export const isRef = (v: unknown): v is string => typeof v === "string" && REF.test(v);

/** Look a dotted path up in the token tree: `colors.primary`, `typography.h1`, `components.button.textColor`. */
export function lookup(
  t: Tokens,
  path: string,
): TokenValue | Typography | Record<string, TokenValue> | undefined {
  const [g, a, b] = path.split(".");
  if (g === undefined || a === undefined) return undefined;
  const group = (GROUPS as readonly string[]).includes(g)
    ? (t as unknown as Record<string, Record<string, unknown>>)[g]
    : undefined;
  if (group === undefined || !Object.hasOwn(group, a)) return undefined;
  const v = group[a];
  if (b === undefined) return v as TokenValue | Typography | Record<string, TokenValue>;
  if (v !== null && typeof v === "object" && Object.hasOwn(v, b))
    return (v as Record<string, TokenValue>)[b];
  return undefined;
}

export interface Resolved {
  value: TokenValue | Typography | Record<string, TokenValue> | undefined;
  /** `broken` ⇒ some link in the chain does not exist; `cycle` ⇒ the chain loops. */
  error?: "broken" | "cycle";
  /** The reference chain followed, e.g. `["{components.a}", "{colors.b}"]`. */
  chain: string[];
}

/** Follow `{path}` references (a value that is exactly a reference) to a final value, detecting cycles. */
export function resolveRef(t: Tokens, value: unknown): Resolved {
  const chain: string[] = [];
  const seen = new Set<string>();
  let cur: unknown = value;
  while (isRef(cur)) {
    chain.push(cur);
    const path = (REF.exec(cur) as RegExpExecArray)[1] as string;
    if (seen.has(path)) return { value: undefined, error: "cycle", chain };
    seen.add(path);
    const next = lookup(t, path);
    if (next === undefined) return { value: undefined, error: "broken", chain };
    cur = next;
  }
  return { value: cur as Resolved["value"], chain };
}
