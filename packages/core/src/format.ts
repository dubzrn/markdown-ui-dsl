/** Canonical formatter (T-034). Source-preserving normaliser: keeps authored indentation, blank-line structure,
 * closer style (typed vs generic) and comments; canonicalises widgets, attribute order, directives and tables.
 * Self-checking: any line whose re-parse differs from the original falls back to its source text, so
 * `parse(format(x))` is equivalent to `parse(x)` by construction. */
import { printAttrs } from "./attrs.js";
import type { BlockNode, Document, ListItemNode, TableNode } from "./ast.js";
import { parseInline, printInline, type InlineNode } from "./inline.js";
import { parse } from "./parse.js";
import { walkBlocks } from "./walk.js";

export interface FormatResult {
  text: string;
  changed: boolean;
  /** Source lines that kept their original text because the canonical form did not re-parse identically. */
  fallbackLines: number[];
}

const OPENER_TEXT: Record<string, string> = {
  column: "||| COLUMN |||",
  row: "=== ROW ===",
  card: "::: CARD :::",
  modal: "::: MODAL :::",
  header: "::: HEADER :::",
  footer: "::: FOOTER :::",
  "bubble-user": "::: BUBBLE USER :::",
  "bubble-agent": "::: BUBBLE AGENT :::",
};

const indentOf = (s: string): string => /^\s*/.exec(s)?.[0] ?? "";

/** Compare inline ASTs ignoring nothing: they are span-free. */
const sameInline = (a: InlineNode[], b: InlineNode[]): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

function hasRich(run: InlineNode[]): boolean {
  return run.some((n) => n.kind !== "text" && n.kind !== "code");
}

/** Canonical text for an inline run, or `undefined` when it cannot be proven equivalent (caller keeps the source). */
function canonicalInline(raw: string, run: InlineNode[], v2: boolean): string | undefined {
  if (!hasRich(run) && !run.some((n) => n.kind === "strong" || n.kind === "em")) return undefined;
  const printed = printInline(run, { style: "pretty" });
  if (printed === raw) return undefined;
  return sameInline(parseInline(printed, { v2 }), run) ? printed : undefined;
}

function formatTable(t: TableNode, srcLines: string[], v2: boolean): string[] | undefined {
  // a separator row whose width differs from the header is malformed: leave the table as authored
  if (t.align.length !== t.header.length) return undefined;
  const cellText = (raw: string, run: InlineNode[]): string => {
    const c = canonicalInline(raw, run, v2) ?? raw;
    return c.replace(/(?<!\\)\|/g, "\\|");
  };
  const header = t.header.map((c, i) => cellText(c, t.headerInline[i] ?? []));
  const rows = t.rows.map((r, k) => r.map((c, i) => cellText(c, t.rowsInline[k]?.[i] ?? [])));
  const cols = Math.max(header.length, t.align.length, ...rows.map((r) => r.length));
  const width = Array.from({ length: cols }, (_, i) =>
    Math.max(3, header[i]?.length ?? 0, ...rows.map((r) => r[i]?.length ?? 0)),
  );
  const pad = (c: string | undefined, i: number): string => {
    const w = width[i] as number;
    const a = t.align[i] ?? "none";
    const v = c ?? "";
    if (a === "right") return v.padStart(w);
    if (a === "center") return v.padStart(Math.floor((w + v.length) / 2)).padEnd(w);
    return v.padEnd(w);
  };
  const line = (cells: string[]): string =>
    `| ${Array.from({ length: cols }, (_, i) => pad(cells[i], i)).join(" | ")} |`;
  const sep = `| ${Array.from({ length: cols }, (_, i) => {
    const a = t.align[i] ?? "none";
    const w = width[i] as number;
    return a === "center"
      ? `:${"-".repeat(w - 2)}:`
      : a === "left"
        ? `:${"-".repeat(w - 1)}`
        : a === "right"
          ? `${"-".repeat(w - 1)}:`
          : "-".repeat(w);
  }).join(" | ")} |`;
  const out = [line(header), sep, ...rows.map(line)];
  // rows with a different cell count keep their source text so the width warning (W1202) is unchanged
  const bad = t.rows.map((r) => r.length !== t.header.length);
  const first = t.span.start.line - 1;
  return out
    .map((l, i) => (i >= 2 && bad[i - 2] ? (srcLines[first + i] as string) : l))
    .map((l) => l.trimEnd());
}

/** Render without the equivalence safety net (exported for tests). */
export function renderUnchecked(src: string, doc: Document): string {
  const v2 = doc.dsl === "2.0";
  const lines = src.split("\n");
  const out = new Map<number, string[]>(); // 1-based source line → replacement lines
  const set = (line: number, text: string[]): void => void out.set(line, text);

  const fm = doc.frontmatter;
  if (fm !== undefined) {
    for (let l = fm.span.start.line; l <= fm.span.end.line; l++)
      set(l, [(lines[l - 1] as string).trimEnd()]);
    // canonical fences
    set(fm.span.start.line, ["---"]);
    set(fm.span.end.line, ["---"]);
  }

  const lineText = (n: { span: { start: { line: number } } }): string =>
    lines[n.span.start.line - 1] as string;

  const fmtItem = (item: ListItemNode): void => {
    const srcLine = lineText(item);
    const m = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(srcLine);
    if (m === null) return;
    const opens = item.children.find((c) => c.span.start.line === item.span.start.line);
    if (opens !== undefined && "children" in opens && item.inline.length === 0 && item.text === "")
      return; // opener formatted via its node
    const rest = canonicalInline(m[3] as string, item.inline, v2) ?? (m[3] as string).trimEnd();
    set(item.span.start.line, [`${m[1]}${m[2]} ${rest}`]);
  };

  walkBlocks(doc.body, ({ node }) => {
    const ln = node.span.start.line;
    switch (node.kind) {
      case "line": {
        const raw = lineText(node);
        const ind = indentOf(raw);
        const c = canonicalInline(node.text, node.inline, v2);
        set(ln, [ind + (c ?? node.text)]);
        break;
      }
      case "heading": {
        const raw = lineText(node);
        const c = canonicalInline(node.text, node.inline, v2) ?? node.text;
        set(ln, [`${indentOf(raw)}${"#".repeat(node.level)} ${c}`]);
        break;
      }
      case "hint":
        set(ln, [`${indentOf(lineText(node))}> ${node.text}`.trimEnd()]);
        break;
      case "directive": {
        const lead = [...(node.breakpoint !== undefined ? [node.breakpoint] : []), ...node.env]
          .map((x) => `@${x}`)
          .join(" ");
        const pairs = node.tokens.map((t) => `${t.name}: ${t.value}`).join(", ");
        set(ln, [`${indentOf(lineText(node))}> ${lead} ${pairs}`]);
        break;
      }
      case "divider":
        set(ln, [
          `${indentOf(lineText(node))}${node.label === undefined ? "***" : `*** ${node.label} ***`}`,
        ]);
        break;
      case "tabs":
        set(ln, [
          `${indentOf(lineText(node))}|${node.tabs.map((t) => (t.active ? `[ ${t.label} ]` : ` ${t.label} `)).join("|")}|`,
        ]);
        break;
      case "comment":
      case "code": {
        for (let l = node.span.start.line; l <= node.span.end.line; l++)
          set(l, [lines[l - 1] as string]);
        break;
      }
      case "table": {
        const f = formatTable(node, lines, v2);
        if (f !== undefined) {
          const first = node.span.start.line;
          const ind = indentOf(lineText(node));
          f.forEach((l, i) => set(first + i, [ind + l]));
        }
        break;
      }
      case "list":
        node.children.forEach(fmtItem);
        break;
      case "item":
        break;
      default: {
        // containers and named blocks: re-print the opener line; closers keep their authored style
        const raw = lineText(node);
        const prefix = raw.slice(0, node.span.start.col - 1);
        const attrs = "attrs" in node && node.attrs !== undefined ? printAttrs(node.attrs) : "";
        const base =
          node.kind === "block"
            ? `::: ${node.name.toUpperCase()}${node.args === "" ? "" : ` ${node.args}`} :::`
            : (OPENER_TEXT[node.kind] as string);
        set(ln, [`${prefix}${base}${attrs}`]);
      }
    }
  });

  // assemble: replacements, trailing-space trim, blank-line collapse
  const result: string[] = [];
  const protectedLines = new Set<number>();
  walkBlocks(doc.body, ({ node }) => {
    if (node.kind === "code" || node.kind === "comment")
      for (let l = node.span.start.line; l <= node.span.end.line; l++) protectedLines.add(l);
  });
  lines.forEach((orig, i) => {
    const no = i + 1;
    const r = out.get(no);
    const text = r !== undefined ? r.join("\n") : protectedLines.has(no) ? orig : orig.trimEnd();
    result.push(text);
  });

  // collapse >1 blank lines (outside code/comments), strip leading blanks, ensure one trailing newline
  const collapsed: string[] = [];
  lines.forEach((_, i) => {
    const t = result[i] as string;
    const blank = t.trim() === "" && !protectedLines.has(i + 1);
    if (
      blank &&
      (collapsed.length === 0 || (collapsed[collapsed.length - 1] as string).trim() === "")
    )
      return;
    collapsed.push(t);
  });
  // An unterminated comment/fence swallows the rest of the file, trailing newline included: leave its tail alone.
  const unterminated = doc.diagnostics.some((d) => d.code === "E1003" || d.code === "E1005");
  if (!unterminated)
    while (collapsed.length > 0 && (collapsed[collapsed.length - 1] as string).trim() === "")
      collapsed.pop();
  const text = unterminated
    ? collapsed.join("\n")
    : collapsed.length === 0
      ? ""
      : `${collapsed.join("\n")}\n`;
  return text;
}

export function format(source: string): FormatResult {
  const src = source.replace(/\r\n/g, "\n");
  const doc = parse(src);
  const fallbackLines: number[] = [];
  let text = renderUnchecked(src, doc);
  // document-level self-check: equivalent AST or keep the (whitespace-normalised) source
  if (!equivalent(parse(text), doc)) {
    fallbackLines.push(0);
    text =
      src
        .split("\n")
        .map((l) => l.trimEnd())
        .join("\n")
        .replace(/\n+$/, "") + "\n";
    if (!equivalent(parse(text), doc)) text = src;
  }
  return { text, changed: text !== source, fallbackLines };
}

function strip(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(strip);
  if (v !== null && typeof v === "object") {
    const o: Record<string, unknown> = {};
    const rec = v as Record<string, unknown>;
    for (const [k, x] of Object.entries(rec)) {
      if (k === "span" || k === "lineStarts" || k === "closed") continue;
      // raw text mirrors of inline content / table cells may be re-spelled by canonicalisation
      if (k === "text" && "inline" in rec) continue;
      if ((k === "header" || k === "rows") && "headerInline" in rec) continue;
      o[k] = strip(x);
    }
    return o;
  }
  return v;
}

/** Two documents are equivalent when their ASTs and diagnostic codes match, ignoring spans. */
export function equivalent(a: Document, b: Document): boolean {
  return (
    JSON.stringify(strip(a.body)) === JSON.stringify(strip(b.body)) &&
    JSON.stringify(a.diagnostics.map((d) => d.code)) ===
      JSON.stringify(b.diagnostics.map((d) => d.code)) &&
    JSON.stringify(a.meta) === JSON.stringify(b.meta)
  );
}

export type { BlockNode };
