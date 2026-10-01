/** DSL 2.0 widget primitives `[ KIND: args ]` (RFC-0001 §3b). */

export const WIDGET_KINDS = [
  "SLIDER",
  "DATE",
  "FILE",
  "PROGRESS",
  "CHART",
  "STAT",
  "SKELETON",
  "AVATAR",
  "ICON",
  "CRUMBS",
  "PAGER",
  "STEPPER",
  "MENUBAR",
] as const;
export type WidgetKind = (typeof WIDGET_KINDS)[number];

export interface WidgetArgs {
  positional: string[];
  named: Record<string, string>;
}

/** Positional-then-keyed arguments; values with spaces are double-quoted. */
export function parseArgs(raw: string): WidgetArgs {
  const toks: string[] = [];
  let cur = "";
  let q = false;
  for (const ch of raw) {
    if (ch === '"') {
      q = !q;
      cur += ch;
    } else if (!q && /\s/.test(ch)) {
      if (cur !== "") toks.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur !== "") toks.push(cur);
  const out: WidgetArgs = { positional: [], named: {} };
  const unq = (s: string): string =>
    s.length >= 2 && s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1) : s;
  for (const t of toks) {
    const m = /^([A-Za-z][\w-]*)=(.*)$/.exec(t);
    if (m !== null) out.named[m[1] as string] = unq(m[2] as string);
    else out.positional.push(unq(t));
  }
  return out;
}

const NUM = /^-?\d+(\.\d+)?$/;

/** Returns human-readable problems (empty when valid). */
export function validateWidget(kind: WidgetKind, raw: string, args: WidgetArgs): string[] {
  const p = args.positional;
  const n = args.named;
  switch (kind) {
    case "SLIDER": {
      const m = /^(-?\d+(?:\.\d+)?)\.\.(-?\d+(?:\.\d+)?)$/.exec(p[0] ?? "");
      if (m === null) return ["SLIDER needs a range like 0..100"];
      const out: string[] = [];
      if (Number(m[1]) >= Number(m[2])) out.push("SLIDER range must be ascending");
      for (const k of ["step", "value"])
        if (k in n && !NUM.test(n[k] as string)) out.push(`SLIDER ${k} must be a number`);
      return out;
    }
    case "DATE":
      return raw.trim() === "range" || /^\d{4}-\d{2}-\d{2}$/.test(raw.trim()) || raw.trim() === ""
        ? []
        : ["DATE takes an ISO date (2026-03-15), `range`, or nothing"];
    case "FILE":
    case "AVATAR":
      return raw.trim() === "" ? [`${kind} needs a label`] : [];
    case "PROGRESS": {
      const m = /^(\d{1,3})%$/.exec(raw.trim());
      return m !== null && Number(m[1]) <= 100 ? [] : ["PROGRESS needs a percentage 0%..100%"];
    }
    case "CHART": {
      const out: string[] = [];
      if (!["line", "bar", "pie", "scatter"].includes(p[0] ?? ""))
        out.push("CHART type must be line|bar|pie|scatter");
      if (!("data" in n)) out.push("CHART needs data=<name>");
      return out;
    }
    case "STAT":
      return p.length >= 2 ? [] : ['STAT needs "label" value'];
    case "SKELETON":
      return "rows" in n && !/^\d+$/.test(n["rows"] as string)
        ? ["SKELETON rows must be an integer"]
        : [];
    case "ICON":
      return /^[a-z][\w-]*$/.test(p[0] ?? "") ? [] : ["ICON needs a name like bell"];
    case "CRUMBS":
    case "STEPPER":
      return raw.split(">").filter((s) => s.trim() !== "").length >= (kind === "STEPPER" ? 2 : 1)
        ? []
        : [
            `${kind} needs ${kind === "STEPPER" ? "at least two" : "at least one"} items separated by >`,
          ];
    case "PAGER": {
      const m = /^(\d+)\/(\d+)$/.exec(raw.trim());
      return m !== null && Number(m[1]) >= 1 && Number(m[1]) <= Number(m[2])
        ? []
        : ["PAGER needs n/total with 1 <= n <= total"];
    }
    case "MENUBAR":
      return splitMenu(raw).length >= 1 ? [] : ["MENUBAR needs at least one menu"];
  }
}

/** Split on unescaped `|`. */
export function splitMenu(raw: string): string[] {
  return raw
    .split(/(?<!\\)\|/)
    .map((s) => s.replace(/\\\|/g, "|").trim())
    .filter((s) => s !== "");
}
