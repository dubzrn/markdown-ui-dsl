/** Inline parser (T-016, extended for DSL 2.0 in T-020…T-023). Decisions: docs/adr/ADR-005-v1-ambiguity-decisions.md. */
import { parseAttrs, printAttrs, splitAttrs, type Attrs } from "./attrs.js";
import {
  WIDGET_KINDS,
  parseArgs,
  validateWidget,
  type WidgetArgs,
  type WidgetKind,
} from "./widgets.js";

interface WithAttrs {
  attrs?: Attrs;
}
export type InlineNode =
  | { kind: "text"; value: string }
  | { kind: "strong"; children: InlineNode[] }
  | { kind: "em"; children: InlineNode[] }
  | { kind: "code"; value: string }
  | ({ kind: "button"; label: string; action?: string } & WithAttrs)
  | ({ kind: "link"; label: string; target: string } & WithAttrs)
  | ({ kind: "input"; placeholder: string } & WithAttrs)
  | ({ kind: "image"; description: string } & WithAttrs)
  | ({ kind: "badge"; label: string } & WithAttrs)
  | ({ kind: "checkbox"; checked: boolean; label: string } & WithAttrs)
  | ({ kind: "radio"; checked: boolean; label: string } & WithAttrs)
  | ({ kind: "toggle"; on: boolean; label: string } & WithAttrs)
  | ({ kind: "dropdown"; label: string; options?: string[]; dynamic?: string } & WithAttrs)
  | ({ kind: "widget"; widget: Lowercase<WidgetKind>; raw: string; args: WidgetArgs } & WithAttrs)
  | { kind: "binding"; path: string }
  | ({ kind: "use"; path: string } & WithAttrs);

/** Problems found while parsing (the block parser turns them into diagnostics on the line). */
export interface InlineIssue {
  code: "E1301" | "E1302" | "W1301" | "E2102";
  message: string;
}
export interface InlineOptions {
  /** DSL 2.0 constructs on (attributes, widgets, bindings, includes). */
  v2?: boolean;
  issues?: InlineIssue[];
}

export const PATH_RE = /^[A-Za-z_][\w-]*(?:\.[A-Za-z_][\w-]*|\[\d+\])*$/;

/** Characters a backslash can escape (D7). */
export const ESCAPABLE = "\\[](){}|>#*_`";

const MAX_DEPTH = 8;

/** Index of the closing `close` at/after `from`, skipping backslash escapes; -1 if none. */
function findClose(s: string, from: number, close: string): number {
  for (let i = from; i < s.length; i++) {
    if (s[i] === "\\") i++;
    else if (s.startsWith(close, i)) return i;
    else if (s[i] === "`") {
      // code spans bind tighter than any other delimiter (D8)
      const j = s.indexOf("`", i + 1);
      if (j > i + 1) i = j;
    }
  }
  return -1;
}

/** Remove D7 escapes from a raw label/target. */
export function unescape(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i] as string;
    if (c === "\\" && i + 1 < s.length && ESCAPABLE.includes(s[i + 1] as string)) {
      out += s[i + 1];
      i++;
    } else out += c;
  }
  return out;
}

const isAlnum = (c: string | undefined): boolean => c !== undefined && /[\p{L}\p{N}]/u.test(c);

/** Line-start widgets: checkbox, radio, toggle, dropdown (D5). Returns a node or undefined. */
function lineStartRaw(s: string): InlineNode | undefined {
  let m = /^\[( |x|X)\] (.+)$/.exec(s);
  if (m !== null)
    return { kind: "checkbox", checked: m[1] !== " ", label: unescape((m[2] as string).trim()) };
  m = /^\((?: |x|X)\) (.+)$/.exec(s);
  if (m !== null)
    return {
      kind: "radio",
      checked: !s.startsWith("( )"),
      label: unescape((m[1] as string).trim()),
    };
  m = /^\[(on|off)\] (.+)$/.exec(s);
  if (m !== null)
    return { kind: "toggle", on: m[1] === "on", label: unescape((m[2] as string).trim()) };
  m = /^\[v\] (.+)$/.exec(s);
  if (m !== null) {
    const rest = (m[1] as string).trim();
    const o = /^(.*?)\s*\{([^{}]*)\}$/.exec(rest);
    if (o === null) return { kind: "dropdown", label: unescape(rest) };
    const body = (o[2] as string).trim();
    const label = unescape((o[1] as string).trim());
    const dyn = /^dynamic:\s*([A-Za-z][\w-]*)$/.exec(body);
    if (dyn !== null) return { kind: "dropdown", label, dynamic: dyn[1] as string };
    return {
      kind: "dropdown",
      label,
      options: body === "" ? [] : body.split(",").map((x) => unescape(x.trim())),
    };
  }
  return undefined;
}

/** `inEmph` is internal: emphasis never nests (`**a *b* c**` keeps the inner stars literal), which keeps printing unambiguous. */
function lineStart(s: string, ctx: Ctx): InlineNode | undefined {
  if (ctx.v2) {
    const [before, src] = splitAttrs(s);
    if (src !== undefined) {
      const n = lineStartRaw(before.trimEnd());
      if (n === undefined) return undefined;
      const r = parseAttrs(src);
      ctx.issues.push(...r.issues);
      (n as WithAttrs).attrs = r.attrs;
      return n;
    }
  }
  return lineStartRaw(s);
}

interface Ctx {
  v2: boolean;
  issues: InlineIssue[];
}

export function parseInline(input: string, opts: InlineOptions = {}): InlineNode[] {
  const ctx: Ctx = { v2: opts.v2 === true, issues: opts.issues ?? [] };
  const s = input.trim();
  const head = lineStart(s, ctx);
  if (head !== undefined) return [head];
  return inl(s, 0, false, ctx);
}

/** Parse `{: … }` directly at `at`; returns the attributes and the index after the closing brace. */
function attrsAt(s: string, at: number, ctx: Ctx): [Attrs | undefined, number] {
  if (!ctx.v2) return [undefined, at];
  const m = /^\{:(?=[ #.A-Za-z])([^{}]*)\}/.exec(s.slice(at));
  if (m === null) return [undefined, at];
  const r = parseAttrs(m[1] as string);
  ctx.issues.push(...r.issues);
  return [r.attrs, at + m[0].length];
}

/** `inEmph` is internal: emphasis never nests (`**a *b* c**` keeps the inner stars literal), which keeps printing unambiguous. */
function inl(s: string, depth: number, inEmph: boolean, ctx: Ctx): InlineNode[] {
  const out: InlineNode[] = [];
  let buf = "";
  const flush = (): void => {
    if (buf !== "") {
      out.push({ kind: "text", value: buf });
      buf = "";
    }
  };
  let i = 0;
  while (i < s.length) {
    const c = s[i] as string;
    if (c === "\\" && i + 1 < s.length && ESCAPABLE.includes(s[i + 1] as string)) {
      buf += s[i + 1];
      i += 2;
      continue;
    }
    if (c === "`") {
      const j = s.indexOf("`", i + 1);
      if (j > i + 1) {
        flush();
        out.push({ kind: "code", value: s.slice(i + 1, j) });
        i = j + 1;
        continue;
      }
    }
    if (c === "(" && s[i + 1] === "(") {
      const j = findClose(s, i + 2, "))");
      const label = j === -1 ? "" : s.slice(i + 2, j).trim();
      if (j !== -1 && label !== "") {
        flush();
        const badge: InlineNode = { kind: "badge", label: unescape(label) };
        const [a, e] = attrsAt(s, j + 2, ctx);
        if (a !== undefined) badge.attrs = a;
        out.push(badge);
        i = e;
        continue;
      }
    }
    if (ctx.v2 && c === "{" && s[i + 1] === "{") {
      const j = s.indexOf("}}", i + 2);
      if (j !== -1) {
        const path = s.slice(i + 2, j).trim();
        if (PATH_RE.test(path)) {
          flush();
          out.push({ kind: "binding", path });
          i = j + 2;
          continue;
        }
        ctx.issues.push({
          code: "E2102",
          message: `Bindings take a data path only, not "${path}".`,
        });
      }
    }
    if (ctx.v2 && c === "[" && s[i + 1] === "[") {
      const j = s.indexOf("]]", i + 2);
      const m = j === -1 ? null : /^\s*USE:\s*(\S+)\s*$/.exec(s.slice(i + 2, j));
      if (m !== null) {
        flush();
        const use: InlineNode = { kind: "use", path: m[1] as string };
        const before = ctx.issues.length;
        const [a, e] = attrsAt(s, j + 2, ctx);
        // include props are free-form: unknown keys are not warned about
        for (let k = ctx.issues.length - 1; k >= before; k--)
          if (ctx.issues[k]?.code === "W1301") ctx.issues.splice(k, 1);
        if (a !== undefined) use.attrs = a;
        out.push(use);
        i = e;
        continue;
      }
      if (j !== -1) {
        // `[[ … ]]` that is not an include stays literal text
        buf += s.slice(i, j + 2);
        i = j + 2;
        continue;
      }
    }
    if (c === "[") {
      const j = findClose(s, i + 1, "]");
      if (j !== -1) {
        const raw = s.slice(i + 1, j);
        const inner = raw.trim();
        const padded = raw !== inner;
        let node: InlineNode | undefined;
        let end = j + 1;
        let target: string | undefined;
        if (s[j + 1] === "(") {
          const k = findClose(s, j + 2, ")");
          if (k !== -1) {
            target = unescape(s.slice(j + 2, k).trim());
            end = k + 1;
          }
        }
        const wm = ctx.v2 ? /^([A-Z][A-Z]+):\s*(.*)$/.exec(inner) : null;
        if (wm !== null && wm[1] !== "IMG") {
          const kind = wm[1] as string;
          if ((WIDGET_KINDS as readonly string[]).includes(kind)) {
            const raw = wm[2] as string;
            const args = parseArgs(raw);
            for (const msg of validateWidget(kind as WidgetKind, raw, args))
              ctx.issues.push({ code: "E1301", message: msg });
            node = {
              kind: "widget",
              widget: kind.toLowerCase() as Lowercase<WidgetKind>,
              raw,
              args,
            };
            end = j + 1;
          } else {
            ctx.issues.push({ code: "E1302", message: `Unknown primitive ${kind}.` });
          }
        }
        if (node !== undefined) {
          // widget handled above
        } else if (inner.startsWith("text:"))
          node = { kind: "input", placeholder: unescape(inner.slice(5).trim()) };
        else if (inner.startsWith("IMG:"))
          node = { kind: "image", description: unescape(inner.slice(4).trim()) };
        else if (inner !== "" && target !== undefined) {
          node = padded
            ? { kind: "button", label: unescape(inner), action: target }
            : { kind: "link", label: unescape(inner), target };
        } else if (inner !== "" && padded) {
          node = { kind: "button", label: unescape(inner) };
          end = j + 1;
        }
        if (node !== undefined) {
          if (node.kind === "input" || node.kind === "image") end = j + 1;
          const [a, e] = attrsAt(s, end, ctx);
          if (a !== undefined) {
            (node as WithAttrs).attrs = a;
            end = e;
          }
          flush();
          out.push(node);
          i = end;
          continue;
        }
      }
    }
    if (c === "*" && depth < MAX_DEPTH) {
      const strong = s.startsWith("**", i);
      const mark = strong ? "**" : "*";
      const j = inEmph ? -1 : findClose(s, i + mark.length, mark);
      const body = j === -1 ? "" : s.slice(i + mark.length, j);
      if (j !== -1 && body.trim() !== "" && !/^\s|\s$/.test(body)) {
        flush();
        const children = inl(body, depth + 1, true, ctx);
        out.push(strong ? { kind: "strong", children } : { kind: "em", children });
        i = j + mark.length;
        continue;
      }
    }
    if (c === "_" && depth < MAX_DEPTH && !inEmph && !isAlnum(s[i - 1])) {
      const j = findClose(s, i + 1, "_");
      const body = j === -1 ? "" : s.slice(i + 1, j);
      if (j !== -1 && body !== "" && !/^\s|\s$/.test(body) && !isAlnum(s[j + 1])) {
        flush();
        out.push({ kind: "em", children: inl(body, depth + 1, true, ctx) });
        i = j + 1;
        continue;
      }
    }
    buf += c;
    i++;
  }
  flush();
  return out;
}

/** Targets (link/button/include) only need `\\` and `)` escaped. */
const escTarget = (t: string): string => t.replace(/[\\)]/g, (c) => `\\${c}`);

const esc = (t: string): string =>
  [...t].map((ch) => (ESCAPABLE.includes(ch) ? `\\${ch}` : ch)).join("");

/** Canonical printer; `parseInline(printInline(x))` equals `x` after normalisation. */
/** Minimal escaping for prose inside a text node ("pretty" style); the strict printer escapes every special character. */
function escPretty(t: string, atLineStart: boolean): string {
  let out = "";
  for (let i = 0; i < t.length; i++) {
    const c = t[i] as string;
    const prev = t[i - 1];
    const next = t[i + 1];
    let needs = false;
    if (c === "\\") needs = next === undefined || ESCAPABLE.includes(next);
    else if (c === "[" || c === "]" || c === "`" || c === "*") needs = true;
    else if (c === "_") needs = !(isAlnum(prev) && isAlnum(next));
    else if (c === "(") needs = next === "(" || prev === "(" || prev === "]" || i === 0;
    else if (c === "{") needs = next === "{" || next === ":";
    else if ((c === "#" || c === ">") && atLineStart && i === 0) needs = true;
    out += needs ? `\\${c}` : c;
  }
  return out;
}

export interface PrintOptions {
  /** `pretty` escapes only what is needed to re-parse identically; `strict` (default) escapes every special character. */
  style?: "strict" | "pretty";
}

/** Pretty label escaping: only the delimiter that would end the construct (and a backslash before an escapable char). */
function escLabel(t: string, closers: string): string {
  let out = "";
  for (let i = 0; i < t.length; i++) {
    const c = t[i] as string;
    const next = t[i + 1];
    const needs = c === "\\" ? next === undefined || ESCAPABLE.includes(next) : closers.includes(c);
    out += needs ? `\\${c}` : c;
  }
  return out;
}

export function printInline(nodes: InlineNode[], opts: PrintOptions = {}): string {
  const pretty = opts.style === "pretty";
  // label escaping: strict style escapes every special character, pretty only what would end the construct
  const L = (t: string, closers: string): string => (pretty ? escLabel(t, closers) : esc(t));
  const at = (n: WithAttrs): string => (n.attrs === undefined ? "" : printAttrs(n.attrs));
  return nodes
    .map((n): string => {
      switch (n.kind) {
        case "text":
          return pretty ? escPretty(n.value, nodes[0] === n) : esc(n.value);
        case "strong":
          return `**${printInline(n.children, opts)}**`;
        case "em":
          return `*${printInline(n.children, opts)}*`;
        case "code":
          return `\`${n.value}\``;
        case "button":
          return (
            (n.action === undefined
              ? `[ ${L(n.label, "]")} ]`
              : `[ ${L(n.label, "]")} ](${escTarget(n.action)})`) + at(n)
          );
        case "link":
          return `[${L(n.label, "]")}](${escTarget(n.target)})${at(n)}`;
        case "input":
          return `[ text: ${L(n.placeholder, "]")} ]${at(n)}`;
        case "image":
          return `[ IMG: ${L(n.description, "]")} ]${at(n)}`;
        case "badge":
          return `(( ${L(n.label, ")")} ))${at(n)}`;
        case "checkbox":
          return `[${n.checked ? "x" : " "}] ${L(n.label, "{")}${at(n)}`;
        case "radio":
          return `(${n.checked ? "x" : " "}) ${L(n.label, "{")}${at(n)}`;
        case "toggle":
          return `[${n.on ? "on" : "off"}] ${L(n.label, "{")}${at(n)}`;
        case "dropdown": {
          const tail =
            n.dynamic !== undefined
              ? ` {dynamic: ${n.dynamic}}`
              : n.options !== undefined
                ? ` {${n.options.map(esc).join(", ")}}`
                : "";
          return `[v] ${L(n.label, "{")}${tail}${at(n)}`;
        }
        case "widget":
          return `[ ${n.widget.toUpperCase()}: ${n.raw} ]${at(n)}`;
        case "binding":
          return `{{ ${n.path} }}`;
        case "use":
          return `[[ USE: ${n.path} ]]${at(n)}`;
      }
    })
    .join("");
}
