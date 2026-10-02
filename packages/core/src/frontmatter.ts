import { dict } from "./dict.js";

/** Strict YAML-subset frontmatter parser (T-017, ADR-004). Anything outside the subset is a diagnostic, never a silent mis-parse. */

export type Scalar = string | number | boolean | null;
export type YamlValue = Scalar | YamlValue[] | { [key: string]: YamlValue };
export type FrontmatterData = { [key: string]: YamlValue };

export interface FrontmatterIssue {
  code: "E1102" | "E1103" | "E1104" | "W1204";
  /** 1-based line within the raw frontmatter text (line 1 = first line after the opening fence). */
  line: number;
  message: string;
}

export interface FrontmatterResult {
  data: FrontmatterData;
  issues: FrontmatterIssue[];
}

/** Keys the toolchain knows (SPEC §2.2). Others produce W1204. */
export const KNOWN_KEYS = [
  "dsl",
  "type",
  "framework",
  "theme",
  "component",
  "catalog",
  "map",
  "data",
  "actions",
  "requirements",
  "constraints",
  "lang",
  "dir",
  "title",
  "caption",
  "start",
] as const;

interface Ctx {
  issues: FrontmatterIssue[];
}

function unsupported(ctx: Ctx, line: number, what: string): void {
  ctx.issues.push({
    code: "E1102",
    line,
    message: `Unsupported YAML (${what}); frontmatter accepts a strict subset (ADR-004).`,
  });
}

/** Strip a trailing `# comment` (only when preceded by whitespace and outside quotes). */
function stripComment(s: string): string {
  let q: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i] as string;
    if (q !== null) {
      if (c === "\\" && q === '"') i++;
      else if (c === q) q = null;
    } else if (c === '"' || c === "'") q = c;
    else if (c === "#" && (i === 0 || /\s/.test(s[i - 1] as string))) return s.slice(0, i);
  }
  return s;
}

function scalar(raw: string, ctx: Ctx, line: number): YamlValue {
  const s = raw.trim();
  if (s === "" || s === "~" || s === "null") return s === "" ? null : null;
  if (s === "true") return true;
  if (s === "false") return false;
  // Only integers are numbers: `2.0` must stay the string "2.0" (a JS number would lose it, and `dsl: 2.0` is a version).
  if (/^-?\d+$/.test(s)) return Number(s);
  if (s.startsWith('"')) {
    if (!/^"(?:[^"\\]|\\.)*"$/.test(s)) {
      unsupported(ctx, line, "unterminated double-quoted string");
      return s;
    }
    try {
      return JSON.parse(s) as string;
    } catch {
      unsupported(ctx, line, "invalid escape in double-quoted string");
      return s;
    }
  }
  if (s.startsWith("'")) {
    if (!/^'(?:[^']|'')*'$/.test(s)) {
      unsupported(ctx, line, "unterminated single-quoted string");
      return s;
    }
    return s.slice(1, -1).replace(/''/g, "'");
  }
  if (/^[&*!|>@`%]/.test(s)) {
    unsupported(ctx, line, `"${s[0]}" anchors, aliases, tags and block scalars are not supported`);
    return s;
  }
  if (s.startsWith("[") || s.startsWith("{")) return flow(s, ctx, line);
  return s;
}

/** Flow collections: `[a, b]`, `{ k: v, k2: v2 }`. Single-line only, no nested flow collections. */
function flow(s: string, ctx: Ctx, line: number): YamlValue {
  const open = s[0] as string;
  const close = open === "[" ? "]" : "}";
  if (!s.endsWith(close)) {
    unsupported(ctx, line, "flow collection must close on the same line");
    return s;
  }
  const inner = s.slice(1, -1);
  if (/[[{]/.test(inner.replace(/"(?:[^"\\]|\\.)*"|'(?:[^']|'')*'/g, ""))) {
    unsupported(ctx, line, "nested flow collections");
    return s;
  }
  const parts = splitTop(inner);
  if (open === "[") return parts.filter((p) => p.trim() !== "").map((p) => scalar(p, ctx, line));
  const obj: { [key: string]: YamlValue } = dict<YamlValue>();
  for (const p of parts) {
    if (p.trim() === "") continue;
    const m = /^\s*("(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^:\s][^:]*?)\s*:\s*(.*)$/.exec(p);
    if (m === null) {
      unsupported(ctx, line, "flow mapping entry without `key: value`");
      continue;
    }
    obj[String(scalar(m[1] as string, ctx, line))] = scalar(m[2] as string, ctx, line);
  }
  return obj;
}

function splitTop(s: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i] as string;
    if (q !== null) {
      cur += c;
      if (c === "\\" && q === '"') cur += s[++i] ?? "";
      else if (c === q) q = null;
    } else if (c === '"' || c === "'") {
      q = c;
      cur += c;
    } else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

interface Row {
  indent: number;
  text: string;
  line: number;
}

export function parseFrontmatter(raw: string): FrontmatterResult {
  const ctx: Ctx = { issues: [] };
  const rows: Row[] = [];
  raw.split("\n").forEach((l, i) => {
    const line = l.endsWith("\r") ? l.slice(0, -1) : l;
    if (/\t/.test(line.match(/^\s*/)?.[0] ?? "")) {
      unsupported(ctx, i + 1, "tab indentation");
      return;
    }
    const text = stripComment(line).replace(/\s+$/, "");
    if (text.trim() === "") return;
    rows.push({ indent: line.length - line.trimStart().length, text: text.trim(), line: i + 1 });
  });
  const data: FrontmatterData = dict<YamlValue>();
  let pos = 0;

  const block = (indent: number): YamlValue => {
    const first = rows[pos];
    if (first === undefined) return null;
    if (first.text.startsWith("- ") || first.text === "-") return list(indent);
    return map(indent);
  };
  const list = (indent: number): YamlValue => {
    const out: YamlValue[] = [];
    for (
      let r = rows[pos];
      r !== undefined && r.indent === indent && (r.text.startsWith("- ") || r.text === "-");
      r = rows[pos]
    ) {
      pos++;
      const body = r.text.slice(1).trim();
      if (/^[^\s"'[{][^:]*:(\s|$)/.test(body)) {
        unsupported(ctx, r.line, "mapping inside a list item");
        continue;
      }
      out.push(scalar(body, ctx, r.line));
    }
    return out;
  };
  const map = (indent: number): { [key: string]: YamlValue } => {
    const obj: { [key: string]: YamlValue } = dict<YamlValue>();
    for (let r = rows[pos]; r !== undefined; r = rows[pos]) {
      if (r.indent < indent) break;
      if (r.indent > indent) {
        unsupported(ctx, r.line, "unexpected indentation");
        pos++;
        continue;
      }
      const m = /^("(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^\s:"'#][^:]*?)\s*:(?:\s+(.*))?$/.exec(r.text);
      if (m === null) {
        unsupported(ctx, r.line, "line is not `key: value`");
        pos++;
        continue;
      }
      pos++;
      const ks = scalar(m[1] as string, ctx, r.line);
      // A flow collection used as a key (`{}: x`) is not a usable key: keep its source text.
      const key = typeof ks === "object" && ks !== null ? (m[1] as string) : String(ks);
      if (key === "<<") unsupported(ctx, r.line, "merge keys");
      if (Object.hasOwn(obj, key))
        ctx.issues.push({ code: "E1103", line: r.line, message: `Duplicate key "${key}".` });
      const rest = m[2];
      let value: YamlValue;
      if (rest === undefined || rest.trim() === "") {
        const next = rows[pos];
        if (
          next !== undefined &&
          (next.indent > indent || (next.indent === indent && next.text.startsWith("- ")))
        ) {
          value = block(next.indent);
        } else value = null;
      } else if (/^[|>][+-]?\d*$/.test(rest.trim())) {
        unsupported(ctx, r.line, "block scalars (| and >)");
        value = null;
        while (rows[pos] !== undefined && (rows[pos] as Row).indent > indent) pos++;
      } else value = scalar(rest, ctx, r.line);
      obj[key] = value;
    }
    return obj;
  };

  while (pos < rows.length) {
    const r = rows[pos] as Row;
    if (r.text === "---" || r.text === "...") {
      unsupported(ctx, r.line, "multiple documents");
      pos++;
      continue;
    }
    Object.assign(data, map(r.indent));
    // map() returns at dedent; a root-level stray line is reported by the loop above
    if (rows[pos] === r) pos++;
  }

  for (const key of Object.keys(data)) {
    if (!(KNOWN_KEYS as readonly string[]).includes(key)) {
      ctx.issues.push({
        code: "W1204",
        line: findLine(raw, key),
        message: `Unknown frontmatter key "${key}".`,
      });
    }
  }
  const dsl = data["dsl"];
  if (dsl !== undefined && !(typeof dsl === "string" || typeof dsl === "number")) {
    ctx.issues.push({
      code: "E1104",
      line: findLine(raw, "dsl"),
      message: "`dsl` must be a version such as 2.0.",
    });
  } else if (dsl !== undefined && !/^(1(\.\d+)*|2\.0)$/.test(String(dsl))) {
    ctx.issues.push({
      code: "E1104",
      line: findLine(raw, "dsl"),
      message: `Unsupported \`dsl: ${String(dsl)}\` (known: 1.x, 2.0).`,
    });
  }
  ctx.issues.sort((a, b) => a.line - b.line);
  return { data, issues: ctx.issues };
}

function findLine(raw: string, key: string): number {
  const i = raw.split("\n").findIndex((l) => l.trimStart().startsWith(`${key}:`));
  return i === -1 ? 1 : i + 1;
}

/** DSL major version of a document: absent ⇒ "1" (RFC-0001 §6). */
export function dslVersion(data: FrontmatterData): "1" | "2.0" {
  return String(data["dsl"] ?? "1") === "2.0" ? "2.0" : "1";
}
