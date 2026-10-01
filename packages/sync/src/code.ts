/** Code extraction adapters (T-071b/c): HTML and TSX units with semantic fingerprints. */
import { norm, type Item, type Role } from "./fingerprint.js";
import { parseElementAt, parseMarkup, type El } from "./markup.js";

export interface CodeUnit {
  anchor: string;
  path: string;
  line: number;
  items: Item[];
}
export interface CodeExtract {
  units: CodeUnit[];
  /** Interactive elements that sit outside every anchored unit (HTML only: JSX roots are found from anchors). */
  unmapped: { tag: string; line: number }[];
  problems: string[];
}

export interface TsxOptions {
  /** Component name → role, e.g. from the component map (`StarRating` → `button`). */
  components?: Record<string, Role>;
}

const ANCHOR_ATTR = "data-mdui-anchor";

const text = (e: El): string =>
  norm(e.children.map((c) => (typeof c === "string" ? c : text(c))).join(" "));
const attr = (e: El, ...names: string[]): string | undefined => {
  for (const n of names) {
    const v = e.attrs[n];
    if (typeof v === "string") return v;
  }
  return undefined;
};

function roleOf(e: El, comps: Record<string, Role>): Role | undefined {
  const raw = e.tag;
  const t = raw.toLowerCase();
  if (Object.hasOwn(comps, raw)) return comps[raw];
  const aria = attr(e, "role");
  if (aria === "button" || aria === "tab") return "button";
  if (aria === "switch") return "switch";
  if (aria === "combobox") return "combobox";
  if (aria === "link") return "link";
  if (/^h[1-6]$/.test(t)) return "heading";
  if (t === "img" || t === "image") return "img";
  if (t === "input") {
    const type = (attr(e, "type") ?? "text").toLowerCase();
    if (type === "checkbox") return "checkbox";
    if (type === "radio") return "radio";
    if (type === "submit" || type === "button" || type === "reset") return "button";
    if (
      type === "hidden" ||
      type === "image" ||
      type === "file" ||
      type === "range" ||
      type === "color"
    )
      return undefined;
    return "textbox";
  }
  if (t === "textarea" || t === "textfield" || t === "textinput" || t === "inputtext")
    return "textbox";
  if (t === "select" || t === "dropdown" || t === "combobox") return "combobox";
  if (t === "button" || /button$/.test(t)) return "button";
  if (t === "a" || t === "link" || t === "navlink" || t === "anchor") return "link";
  if (t === "checkbox") return "checkbox";
  if (t === "radio" || t === "radiobutton") return "radio";
  if (t === "switch" || t === "toggle") return "switch";
  if (t === "input" || /input$/.test(t)) return "textbox";
  return undefined;
}

function labelsById(root: El): Map<string, string> {
  const m = new Map<string, string>();
  const walk = (e: El): void => {
    if (e.tag.toLowerCase() === "label") {
      const f = attr(e, "for", "htmlFor");
      if (f !== undefined) m.set(f, text(e));
    }
    for (const c of e.children) if (typeof c !== "string") walk(c);
  };
  walk(root);
  return m;
}

function itemsOf(root: El, comps: Record<string, Role>): Item[] {
  const labels = labelsById(root);
  const out: Item[] = [];
  const walk = (e: El, isRoot: boolean, inLabel: string | undefined): void => {
    if (!isRoot && e.attrs[ANCHOR_ATTR] !== undefined) return; // a nested unit of its own
    const role = roleOf(e, comps);
    if (role !== undefined) {
      const id = attr(e, "id");
      let label = attr(e, "aria-label", "ariaLabel");
      if (
        role === "textbox" ||
        role === "checkbox" ||
        role === "radio" ||
        role === "switch" ||
        role === "combobox"
      )
        label ??=
          (id !== undefined ? labels.get(id) : undefined) ??
          inLabel ??
          attr(e, "label", "placeholder", "title", "name");
      else if (role === "img") label ??= attr(e, "alt");
      else if (role === "button") label ??= text(e) || attr(e, "value", "label", "title");
      else label ??= text(e);
      const item: Item = { role, label: norm(label ?? "") };
      if (role === "link") item.href = attr(e, "href", "to") ?? "";
      if (role === "heading")
        item.level = Number(/^h([1-6])$/i.exec(e.tag)?.[1] ?? attr(e, "level") ?? 2);
      item.line = e.line;
      out.push(item);
      if (role === "button" || role === "link" || role === "heading") return; // children are the label
    }
    const here = e.tag.toLowerCase() === "label" ? text(e) : inLabel;
    for (const c of e.children) if (typeof c !== "string") walk(c, false, here);
  };
  walk(root, true, undefined);
  return out;
}

function anchored(
  root: El,
  path: string,
  comps: Record<string, Role>,
  into: CodeUnit[],
  problems: string[],
): void {
  const a = root.attrs[ANCHOR_ATTR];
  if (typeof a === "string") {
    if (into.some((u) => u.anchor === a))
      problems.push(`${path}:${root.line} anchor "${a}" appears more than once; the first is used`);
    else into.push({ anchor: a, path, line: root.line, items: itemsOf(root, comps) });
  }
  for (const c of root.children)
    if (typeof c !== "string") anchored(c, path, comps, into, problems);
}

/** HTML: units are elements carrying `data-mdui-anchor="name"` (or preceded by `<!-- ui:anchor name -->`). */
export function extractHtml(
  source: string,
  path: string,
  comps: Record<string, Role> = {},
): CodeExtract {
  const units: CodeUnit[] = [];
  const problems: string[] = [];
  const roots = parseMarkup(source, { jsx: false });
  for (const r of roots) anchored(r, path, comps, units, problems);
  const unmapped: CodeExtract["unmapped"] = [];
  const scan = (e: El, inside: boolean): void => {
    const here = inside || e.attrs[ANCHOR_ATTR] !== undefined;
    const role = roleOf(e, comps);
    if (!here && role !== undefined && role !== "heading" && role !== "img")
      unmapped.push({ tag: e.tag, line: e.line });
    for (const c of e.children) if (typeof c !== "string") scan(c, here);
  };
  for (const r of roots) scan(r, false);
  return { units, unmapped, problems };
}

/**
 * TSX/JSX: units are JSX elements that follow a `ui:anchor name` line or block comment, or carry
 * `data-mdui-anchor="name"`. Only those elements are read; the rest of the file is never interpreted.
 */
export function extractTsx(source: string, path: string, opts: TsxOptions = {}): CodeExtract {
  const comps = opts.components ?? {};
  const units: CodeUnit[] = [];
  const problems: string[] = [];
  const claimed: [number, number][] = [];
  const inClaimed = (o: number): boolean => claimed.some(([a, b]) => o >= a && o < b);
  const roots: { at: number; anchor: string | undefined }[] = [];
  for (const m of source.matchAll(/(?:\/\/|\/\*)\s*ui:anchor\s+([A-Za-z~][\w~-]*)[^\n]*/g)) {
    const from = (m.index as number) + m[0].length;
    const next = /<([A-Za-z][\w.:-]*)/.exec(source.slice(from));
    if (next !== null) roots.push({ at: from + (next.index as number), anchor: m[1] });
  }
  for (const m of source.matchAll(/data-mdui-anchor\s*=\s*(?:"[^"]*"|'[^']*'|\{["'`][^}]*\})/g)) {
    const before = source.slice(0, m.index as number);
    const lt = before.search(/<[A-Za-z][^<]*$/);
    if (lt !== -1) roots.push({ at: lt, anchor: undefined });
  }
  roots.sort((a, b) => a.at - b.at);
  for (const r of roots) {
    if (inClaimed(r.at)) continue;
    const el = parseElementAt(source, r.at, { jsx: true }, r.anchor);
    if (el === undefined) continue;
    claimed.push([el.start, el.end]);
    anchored(el, path, comps, units, problems);
  }
  return { units, unmapped: [], problems };
}
