import type {
  BlockNode,
  DirectiveNode,
  ContainerKind,
  ContainerNode,
  NamedBlockNode,
  Document,
  FrontmatterNode,
  ListItemNode,
  ListNode,
} from "./ast.js";
import { dslVersion, parseFrontmatter, type FrontmatterData } from "./frontmatter.js";
import { parseAttrs, splitAttrs, type Attrs } from "./attrs.js";
import { parseInline, type InlineIssue, type InlineNode } from "./inline.js";
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
const TYPED_END_RE = /^\s*--- END ([A-Z][A-Z0-9]*) ---\s*$/;
const LABELLED_DIVIDER_RE = /^\s*\*\*\* (.+?) \*\*\*\s*$/;
const NAMED_OPENER_RE = /^::: ([A-Z][A-Z0-9]*)(?: (.+?))? :::$/;
/** DSL 2.0 container kinds that take `::: KIND args :::` (RFC-0001 §3b/3c). */
export const BLOCK_KINDS = [
  "GRID",
  "ACCORDION",
  "PANEL",
  "DRAWER",
  "TOAST",
  "TOOLTIP",
  "CALLOUT",
  "EMPTY",
  "TREE",
  "GROUP",
  "REGION",
  "STATE",
  "EACH",
  "IF",
] as const;
const DIVIDER_RE = /^\s*\*\*\*\s*$/;
const HEADING_RE = /^\s{0,3}(#{1,6})\s+(.*)$/;
const ITEM_RE = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
const TABLE_ROW_RE = /^\s*\|(?!\[)/;
const TABLE_SEP_RE = /^\s*\|(\s*:?-+:?\s*\|?)+\s*$/;
const TABS_RE = /^\s*\|\[.*\|\s*$/;
const FENCE_RE = /^\s*```(.*)$/;
const DIRECTIVE_RE = /^\s*>\s*((?:@[A-Za-z0-9-]+(?:\s+|$))+)(.*)$/;
const ENV_TOKENS = [
  "dark",
  "light",
  "print",
  "reduced-motion",
  "contrast-more",
  "touch",
  "hover",
] as const;
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

interface OpenerMatch {
  node: ContainerNode | NamedBlockNode;
  issues: InlineIssue[];
}

/** Recognise a container opener on `text` (already trimmed of list marker). DSL 2.0 adds attributes and named kinds. */
function matchOpener(text: string, v2: boolean, span: Span): OpenerMatch | undefined {
  let body = text.trim();
  let attrs: Attrs | undefined;
  const issues: InlineIssue[] = [];
  if (v2) {
    const [before, src] = splitAttrs(body);
    if (src !== undefined) {
      const r = parseAttrs(src);
      issues.push(...r.issues);
      attrs = r.attrs;
      body = before.trim();
    }
  }
  const kind = OPENERS[body];
  if (kind !== undefined) {
    const node: ContainerNode = { kind, children: [], closed: false, span };
    if (attrs !== undefined) node.attrs = attrs;
    return { node, issues };
  }
  if (!v2) return undefined;
  const m = NAMED_OPENER_RE.exec(body);
  if (m === null) return undefined;
  const word = m[1] as string;
  if (!(BLOCK_KINDS as readonly string[]).includes(word)) {
    issues.push({ code: "E1302", message: `Unknown container ${word}.` });
  }
  const node: NamedBlockNode = {
    kind: "block",
    name: word.toLowerCase(),
    args: m[2] ?? "",
    children: [],
    closed: false,
    span,
  };
  if (attrs !== undefined) node.attrs = attrs;
  return { node, issues };
}

/** Word used by typed closers: `--- END CARD ---`; both bubble kinds close with BUBBLE. */
function closerWord(n: ContainerNode | NamedBlockNode): string {
  if (n.kind === "block") return n.name.toUpperCase();
  return n.kind.startsWith("bubble") ? "BUBBLE" : n.kind.toUpperCase();
}

type Frame = { node: ContainerNode | NamedBlockNode } | { list: ListNode; indent: number };

/** Parse a document. Never throws; always returns a tree plus diagnostics (D10). */
export function parse(source: string): Document {
  const lines = splitLines(source);
  const diagnostics: Diagnostic[] = [];
  const root: BlockNode[] = [];
  const stack: Frame[] = [];
  let frontmatter: FrontmatterNode | undefined;
  let meta: FrontmatterData = {};
  let dslMajor: "1" | "2.0" = "1";
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
  const v2 = (): boolean => dslMajor === "2.0";
  const report = (issues: InlineIssue[], l: Line): void => {
    for (const is of issues) diagnostics.push(makeDiagnostic(is.code, lineSpan(l), is.message));
  };
  /** Inline-parse `text` from line `l`, turning issues into diagnostics. */
  const inl = (text: string, l: Line): InlineNode[] => {
    const issues: InlineIssue[] = [];
    const nodes = parseInline(text, { v2: v2(), issues });
    report(issues, l);
    return nodes;
  };
  const openerAt = (text: string, l: Line, col: number): OpenerMatch | undefined => {
    const m = matchOpener(text, v2(), { start: pos(l, col), end: pos(l, l.text.length + 1) });
    if (m !== undefined) report(m.issues, l);
    return m;
  };
  const push = (m: OpenerMatch, into: BlockNode[]): void => {
    into.push(m.node);
    stack.push({ node: m.node });
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
      const fm = parseFrontmatter(frontmatter.raw);
      meta = fm.data;
      dslMajor = dslVersion(meta);
      for (const issue of fm.issues) {
        // raw line 1 is the line after the opening fence (source line 2)
        const src = lines[issue.line] as Line | undefined;
        diagnostics.push(makeDiagnostic(issue.code, lineSpan(src ?? first), issue.message));
      }
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

    // closer: generic `--- END ---`, and (DSL 2.0 only) typed `--- END KIND ---`
    const typed = v2() ? TYPED_END_RE.exec(t) : null;
    if (END_RE.test(t) || typed !== null) {
      closeLists();
      const top = stack.pop();
      if (top === undefined) diagnostics.push(makeDiagnostic("E1002", lineSpan(l)));
      else if ("node" in top) {
        top.node.closed = true;
        finish(top.node, l);
        if (typed !== null && typed[1] !== closerWord(top.node)) {
          diagnostics.push(
            makeDiagnostic(
              "E1004",
              lineSpan(l),
              `Closer END ${typed[1]} does not match the open ${closerWord(top.node)} block.`,
            ),
          );
        }
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
        inline: [],
        children: [],
        span: { start: pos(l, indent + 1), end: pos(l, t.length + 1) },
      };
      list.children.push(node);
      const opened = openerAt(rest, l, col);
      if (opened !== undefined) {
        node.text = "";
        push(opened, node.children);
      } else node.inline = inl(rest, l);
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
    const opener = openerAt(trimmed, l, t.indexOf(trimmed) + 1);
    if (opener !== undefined) {
      push(opener, sink());
      continue;
    }

    if (DIVIDER_RE.test(t)) {
      sink().push({ kind: "divider", span: lineSpan(l) });
      continue;
    }
    const labelled = v2() ? LABELLED_DIVIDER_RE.exec(t) : null;
    if (labelled !== null && !(labelled[1] as string).includes("***")) {
      sink().push({ kind: "divider", label: labelled[1] as string, span: lineSpan(l) });
      continue;
    }

    // hint / directive
    if (trimmed.startsWith(">")) {
      const text = trimmed.replace(/^>\s?/, "");
      const dm = DIRECTIVE_RE.exec(t);
      if (dm !== null) {
        // Leading `@token`s: one optional breakpoint plus (DSL 2.0 only) environment tokens, in any order (RFC-0001 §3d).
        const lead = (dm[1] as string)
          .trim()
          .split(/\s+/)
          .map((x) => x.slice(1));
        const isBp = (x: string): boolean => (BREAKPOINTS as readonly string[]).includes(x);
        const isEnv = (x: string): boolean =>
          dslMajor === "2.0" && (ENV_TOKENS as readonly string[]).includes(x);
        const bps = lead.filter(isBp);
        if (!lead.every((x) => isBp(x) || isEnv(x))) {
          diagnostics.push(makeDiagnostic("W1201", lineSpan(l)));
        } else {
          const parts = (dm[2] as string).split(",").map((p) => p.trim());
          const pairs = parts.map((p) => PAIR_RE.exec(p));
          if (bps.length <= 1 && parts.length > 0 && pairs.every((p) => p !== null)) {
            const node: DirectiveNode = {
              kind: "directive",
              env: lead.filter((x) => !isBp(x)),
              tokens: pairs.map((p) => ({
                name: (p as RegExpExecArray)[1] as string,
                value: (p as RegExpExecArray)[2] as string,
              })),
              span: lineSpan(l),
            };
            if (bps[0] !== undefined) node.breakpoint = bps[0] as (typeof BREAKPOINTS)[number];
            sink().push(node);
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
        inline: inl(h[2] as string, l),
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
      const rowLines: Line[] = [];
      i++;
      let endLine = next;
      while (i < lines.length) {
        const c = lines[i] as Line;
        if (!TABLE_ROW_RE.test(c.text)) break;
        const row = cells(c.text);
        if (row.length !== header.length) diagnostics.push(makeDiagnostic("W1202", lineSpan(c)));
        rows.push(row);
        rowLines.push(c);
        endLine = c;
        i++;
      }
      sink().push({
        kind: "table",
        header,
        rows,
        headerInline: header.map((c) => inl(c, l)),
        rowsInline: rows.map((r, k) => r.map((c) => inl(c, rowLines[k] ?? l))),
        span: { start: pos(l, 1), end: pos(endLine, endLine.text.length + 1) },
      });
      continue;
    }

    sink().push({ kind: "line", text: trimmed, inline: inl(trimmed, l), span: lineSpan(l) });
  }

  closeLists();
  for (let k = stack.length - 1; k >= 0; k--) {
    const f = stack[k] as Frame;
    if ("node" in f)
      diagnostics.push(makeDiagnostic("E1001", { start: f.node.span.start, end: f.node.span.end }));
  }
  diagnostics.sort((a, b) => a.span.start.offset - b.span.start.offset);
  return {
    frontmatter,
    meta,
    dsl: dslVersion(meta),
    body: root,
    diagnostics,
    lineStarts: lines.map((x) => x.offset),
  };
}
