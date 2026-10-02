import { dict } from "./dict.js";

/** Attribute lists `{: #id .class key=value flag }` (RFC-0001 §3a). */

export interface Attrs {
  id?: string;
  classes: string[];
  props: Record<string, string | true>;
}

export interface AttrIssue {
  code: "E1301" | "W1301";
  message: string;
}

const RESERVED_FLAGS = ["required", "readonly", "disabled", "primary", "destructive", "terminal"];
const RESERVED_STRINGS = [
  "label",
  "hint",
  "error",
  "alt",
  "role",
  "type",
  "pattern",
  "autocomplete",
  "lang",
];
const RESERVED_NUMBERS = ["min", "max", "step", "maxlength"];
const ENUMS: Record<string, readonly string[]> = dict<readonly string[]>({
  live: ["polite", "assertive"],
  scroll: ["x", "y", "both"],
  dir: ["ltr", "rtl"],
});
export const RESERVED_KEYS = [
  ...RESERVED_FLAGS,
  ...RESERVED_STRINGS,
  ...RESERVED_NUMBERS,
  ...Object.keys(ENUMS),
];

/** A trailing `{: … }` (never `{A, B}` dropdown options nor `{{ binding }}`). Returns [text before, attribute source]. */
export function splitAttrs(text: string): [string, string | undefined] {
  const m = /\{:(?=[ #.A-Za-z])([^{}]*)\}\s*$/.exec(text);
  if (m === null) return [text, undefined];
  return [text.slice(0, m.index), m[1] as string];
}

/** Whitespace-separated tokens; double-quoted values may contain spaces. */
function tokens(src: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (const ch of src) {
    if (ch === '"') {
      q = !q;
      cur += ch;
    } else if (!q && /\s/.test(ch)) {
      if (cur !== "") out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur !== "") out.push(cur);
  return out;
}

export function parseAttrs(src: string): { attrs: Attrs; issues: AttrIssue[] } {
  const attrs: Attrs = { classes: [], props: dict<string | true>() };
  const issues: AttrIssue[] = [];
  for (const tok of tokens(src)) {
    if (tok.startsWith("#") && /^#[A-Za-z][\w-]*$/.test(tok)) {
      attrs.id = tok.slice(1);
      continue;
    }
    if (tok.startsWith(".") && /^\.[A-Za-z][\w-]*$/.test(tok)) {
      attrs.classes.push(tok.slice(1));
      continue;
    }
    const m = /^([A-Za-z][\w-]*)(?:=(.*))?$/.exec(tok);
    if (m === null) {
      issues.push({ code: "E1301", message: `Malformed attribute "${tok}".` });
      continue;
    }
    const key = m[1] as string;
    let value: string | true = true;
    if (m[2] !== undefined) {
      const raw = m[2];
      if (raw.startsWith('"')) {
        if (raw.length < 2 || !raw.endsWith('"')) {
          issues.push({ code: "E1301", message: `Unterminated quoted value for "${key}".` });
          continue;
        }
        value = raw.slice(1, -1);
      } else value = raw;
      // There is no escape for `"` inside a value, so such a value could not be printed back faithfully.
      if (typeof value === "string" && value.includes('"')) {
        issues.push({
          code: "E1301",
          message: `Attribute value for "${key}" cannot contain a double quote.`,
        });
        continue;
      }
    }
    if (RESERVED_FLAGS.includes(key)) {
      if (value === "false") value = "false";
      else if (value !== true && value !== "true")
        issues.push({ code: "E1301", message: `"${key}" is a flag.` });
      else value = true;
    } else if (RESERVED_NUMBERS.includes(key)) {
      if (value === true || !/^-?\d+(\.\d+)?$/.test(value))
        issues.push({ code: "E1301", message: `"${key}" needs a number.` });
    } else if (key in ENUMS) {
      const allowed = ENUMS[key] as readonly string[];
      if (value === true || !allowed.includes(value))
        issues.push({ code: "E1301", message: `"${key}" must be one of ${allowed.join(", ")}.` });
    } else if (RESERVED_STRINGS.includes(key)) {
      if (value === true) issues.push({ code: "E1301", message: `"${key}" needs a value.` });
    } else if (!key.startsWith("data-")) {
      issues.push({ code: "W1301", message: `Unknown attribute "${key}".` });
    }
    attrs.props[key] = value;
  }
  return { attrs, issues };
}

/** Canonical attribute-list text (without braces' outer spaces), stable key order. */
export function printAttrs(a: Attrs): string {
  const parts: string[] = [];
  if (a.id !== undefined) parts.push(`#${a.id}`);
  for (const c of a.classes) parts.push(`.${c}`);
  for (const [k, v] of Object.entries(a.props)) {
    if (v === true) parts.push(k);
    else parts.push(/^[\w.\-/:]+$/.test(v) ? `${k}=${v}` : `${k}="${v}"`);
  }
  return `{: ${parts.join(" ")} }`;
}
