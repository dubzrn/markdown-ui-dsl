import type {
  BlockNode,
  ContainerKind,
  ContainerNode,
  Document,
  FrontmatterNode,
  ListItemNode,
  ListNode,
} from "./ast.js";
import { parseInline } from "./inline.js";
import { makeDiagnostic, type Diagnostic, type Pos, type Span } from "./diagnostics.js";

const OPENERS: Record<string, ContainerKind> = {
  "||| COLUMN |||": "column",
  "=== ROW ===": "row",
  "::: CARD :::": "card",
  "::: MODAL :::": "modal",
  "::: HEADER :::": "header",
  "::: FOOTER :::": "footer",
  "::: BUBBLE USER :::": "bubble-user",
  "::: BUBBLE AGENT :::": "bubble-agent",
};
const BREAKPOINTS = ["sm", "md", "lg", "xl"] as const;

const END_RE = /^\s*--- END ---\s*$/;
const DIVIDER_RE = /^\s*\*\*\*\s*$/;
const HEADING_RE = /^\s{0,3}(#{1,6})\s+(.*)$/;
const ITEM_RE = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
const TABLE_ROW_RE = /^\s*\|(?!\[)/;
const TABLE_SEP_RE = /^\s*\|(\s*:?-+:?\s*\|?)+\s*$/;
const TABS_RE = /^\s*\|\[.*\|\s*$/;
const FENCE_RE = /^\s*```(.*)$/;
const DIRECTIVE_RE = /^\s*>\s*@([A-Za-z0-9-]+)\b\s*(.*)$/;
const PAIR_RE = /^([A-Za-z][\w-]*)\s*:\s*(\S.*)$/;

interface Line {
  text: string;
  /** 1-based. */
  no: number;
  offset: number;
}

function splitLines(src: string): Line[] {
  const out: Line[] = [];
  let offset = 0;
  const parts = src.split("\n");
  parts.forEach((raw, i) => {
    const text = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
    out.push({ text, no: i + 1, offset });
    offset += raw.length + 1;
  });
  // A trailing newline yields one empty final element; it is a blank line, which produces no node.
  return out;
}

const pos = (l: Line, col: number): Pos => ({ line: l.no, col, offset: l.offset + col - 1 });
const lineSpan = (l: Line): Span => ({ start: pos(l, 1), end: pos(l, l.text.length + 1) });

function cells(row: string): string[] {
  let s = row.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  const out: string[] = [];
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i] as string;
    if (ch === "\\" && s[i + 1] === "|") {
      cur += "|";
      i++;
    } else if (ch === "|") {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function tabs(row: string): { label: string; active: boolean }[] {
  const inner = row.trim().slice(1, -1);
  return inner
    .split("|")
    .map((part) => part.trim())
    .filter((p) => p !== "")
    .map((p) =>
      p.startsWith("[") && p.endsWith("]")
        ? { label: p.slice(1, -1).trim(), active: true }
        : { label: p, active: false },
    );
}

type Frame = { node: ContainerNode } | { list: ListNode; indent: number };

/** Parse a document. Never throws; always returns a tree plus diagnostics (D10). */
export function parse(source: string): Document {
  const lines = splitLines(source);
  const diagnostics: Diagnostic[] = [];
  const root: BlockNode[] = [];
  const stack: Frame[] = [];
  let frontmatter: FrontmatterNode | undefined;
  let i = 0;

  const sink = (): BlockNode[] => {
    for (let k = stack.length - 1; k >= 0; k--) {
      const f = stack[k] as Frame;
      if ("node" in f) return f.node.children;
      return (f.list.children[f.list.children.length - 1] as ListItemNode).children;
    }
    return root;
  };
  const closeLists = (): void => {
    while (stack.length > 0 && "list" in (stack[stack.length - 1] as Frame)) stack.pop();
  };
  const finish = (n: { span: Span }, l: Line): void => {
    n.span.end = pos(l, l.text.length + 1);
  };
  const openContainer = (kind: ContainerKind, l: Line, col: number, into: BlockNode[]): void => {
    const node: ContainerNode = {
      kind,
      children: [],
      closed: false,
      span: { start: pos(l, col), end: pos(l, l.text.length + 1) },
    };
    into.push(node);
    stack.push({ node });
  };

  // Frontmatter: only when the very first line is `---` (D3).
  const first = lines[0];
  if (first !== undefined && /^---\s*$/.test(first.text)) {
    let close = -1;
    for (let k = 1; k < lines.length; k++) {
      if (/^---\s*$/.test((lines[k] as Line).text)) {
        close = k;
        break;
      }
    }
    if (close === -1) {
      diagnostics.push(makeDiagnostic("E1006", lineSpan(first)));
      i = 1;
    } else {
      const last = lines[close] as Line;
      frontmatter = {
        kind: "frontmatter",
        raw: lines
          .slice(1, close)
          .map((l) => l.text)
          .join("\n"),
        span: { start: pos(first, 1), end: pos(last, last.text.length + 1) },
      };
      i = close + 1;
    }
  }

  while (i < lines.length) {
    const l = lines[i] as Line;
    const t = l.text;
    const trimmed = t.trim();
    i++;
    if (trimmed === "") {
      closeLists();
      continue;
    }

    // closer
    if (END_RE.test(t)) {
      closeLists();
      const top = stack.pop();
      if (top === undefined) diagnostics.push(makeDiagnostic("E1002", lineSpan(l)));
      else if ("node" in top) {
        top.node.closed = true;
        finish(top.node, l);
      }
      continue;
    }

    // list item
    const item = ITEM_RE.exec(t);
    if (item !== null && !DIVIDER_RE.test(t)) {
      const indent = (item[1] as string).length;
      const rest = item[3] as string;
      const col = indent + (item[2] as string).length + 2;
      const ordered = /\d/.test(item[2] as string);
      while (stack.length > 0) {
        const f = stack[stack.length - 1] as Frame;
        if ("list" in f && f.indent > indent) stack.pop();
        else break;
      }
      const top = stack[stack.length - 1];
      let list: ListNode;
      if (top !== undefined && "list" in top && top.indent === indent) list = top.list;
      else {
        list = {
          kind: "list",
          children: [],
          span: { start: pos(l, indent + 1), end: pos(l, t.length + 1) },
        };
        sink().push(list);
        stack.push({ list, indent });
      }
      const node: ListItemNode = {
        kind: "item",
        ordered,
        text: rest,
        inline: parseInline(rest),
        children: [],
        span: { start: pos(l, indent + 1), end: pos(l, t.length + 1) },
      };
      list.children.push(node);
      const kind = OPENERS[rest.trim()];
      if (kind !== undefined) {
        node.text = "";
        node.inline = [];
        openContainer(kind, l, col, node.children);
      }
      continue;
    }

    // any other block ends open lists unless it is indented continuation content of the last item
    closeLists();

    // code fence
    const fence = FENCE_RE.exec(t);
    if (fence !== null) {
      const body: string[] = [];
      let closed = false;
      let endLine = l;
      while (i < lines.length) {
        const c = lines[i] as Line;
        i++;
        endLine = c;
        if (/^\s*```\s*$/.test(c.text)) {
          closed = true;
          break;
        }
        body.push(c.text);
      }
      if (!closed) diagnostics.push(makeDiagnostic("E1005", lineSpan(l)));
      sink().push({
        kind: "code",
        info: (fence[1] as string).trim(),
        text: body.join("\n"),
        span: { start: pos(l, 1), end: pos(endLine, endLine.text.length + 1) },
      });
      continue;
    }

    // comment
    if (trimmed.startsWith("<!--")) {
      const collected: string[] = [t];
      let closed = trimmed.includes("-->");
      let endLine = l;
      while (!closed && i < lines.length) {
        const c = lines[i] as Line;
        i++;
        endLine = c;
        collected.push(c.text);
        if (c.text.includes("-->")) closed = true;
      }
      if (!closed) diagnostics.push(makeDiagnostic("E1003", lineSpan(l)));
      sink().push({
        kind: "comment",
        text: collected.join("\n"),
        span: { start: pos(l, 1), end: pos(endLine, endLine.text.length + 1) },
      });
      continue;
    }

    // container opener
    const opener = OPENERS[trimmed];
    if (opener !== undefined) {
      openContainer(opener, l, t.indexOf(trimmed) + 1, sink());
      continue;
    }

    if (DIVIDER_RE.test(t)) {
      sink().push({ kind: "divider", span: lineSpan(l) });
      continue;
    }

    // hint / directive
    if (trimmed.startsWith(">")) {
      const text = trimmed.replace(/^>\s?/, "");
      const dm = DIRECTIVE_RE.exec(t);
      if (dm !== null) {
        const bp = dm[1] as string;
        if (!(BREAKPOINTS as readonly string[]).includes(bp)) {
          diagnostics.push(makeDiagnostic("W1201", lineSpan(l)));
        } else {
          const parts = (dm[2] as string).split(",").map((p) => p.trim());
          const pairs = parts.map((p) => PAIR_RE.exec(p));
          if (parts.length > 0 && pairs.every((p) => p !== null)) {
            sink().push({
              kind: "directive",
              breakpoint: bp as (typeof BREAKPOINTS)[number],
              tokens: pairs.map((p) => ({
                name: (p as RegExpExecArray)[1] as string,
                value: (p as RegExpExecArray)[2] as string,
              })),
              span: lineSpan(l),
            });
            continue;
          }
          diagnostics.push(makeDiagnostic("W1203", lineSpan(l)));
        }
      }
      sink().push({ kind: "hint", text, span: lineSpan(l) });
      continue;
    }

    // heading
    const h = HEADING_RE.exec(t);
    if (h !== null) {
      sink().push({
        kind: "heading",
        level: (h[1] as string).length,
        text: (h[2] as string).trim(),
        inline: parseInline(h[2] as string),
        span: lineSpan(l),
      });
      continue;
    }

    // tabs
    if (TABS_RE.test(t)) {
      sink().push({ kind: "tabs", tabs: tabs(t), span: lineSpan(l) });
      continue;
    }

    // table: header row + separator row
    const next = lines[i];
    if (TABLE_ROW_RE.test(t) && next !== undefined && TABLE_SEP_RE.test(next.text)) {
      const header = cells(t);
      const rows: string[][] = [];
      i++;
      let endLine = next;
      while (i < lines.length) {
        const c = lines[i] as Line;
        if (!TABLE_ROW_RE.test(c.text)) break;
        const row = cells(c.text);
        if (row.length !== header.length) diagnostics.push(makeDiagnostic("W1202", lineSpan(c)));
        rows.push(row);
        endLine = c;
        i++;
      }
      sink().push({
        kind: "table",
        header,
        rows,
        headerInline: header.map((c) => parseInline(c)),
        rowsInline: rows.map((r) => r.map((c) => parseInline(c))),
        span: { start: pos(l, 1), end: pos(endLine, endLine.text.length + 1) },
      });
      continue;
    }

    sink().push({ kind: "line", text: trimmed, inline: parseInline(trimmed), span: lineSpan(l) });
  }

  closeLists();
  for (let k = stack.length - 1; k >= 0; k--) {
    const f = stack[k] as Frame;
    if ("node" in f)
      diagnostics.push(makeDiagnostic("E1001", { start: f.node.span.start, end: f.node.span.end }));
  }
  diagnostics.sort((a, b) => a.span.start.offset - b.span.start.offset);
  return { frontmatter, body: root, diagnostics };
}
