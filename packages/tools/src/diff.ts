/** Semantic diff of two Markdown UI documents (T-035): added / removed / changed / moved elements, with regressions. */
import { lint } from "@vrillabs/mdui-lint";
import type { Attrs, BlockNode, Document, InlineNode, ListItemNode } from "@vrillabs/mdui-core";
import { childrenOf } from "@vrillabs/mdui-core";

interface Item {
  /** `kind` plus a short human label, e.g. `button "Save"`. */
  desc: string;
  kind: string;
  /** Identity for matching: the author's `#id` when there is one. */
  id: string | undefined;
  /** Everything about this element except its children, for exact matching and change detection. */
  sig: string;
  /** Source line (1-based) in its document. */
  line: number;
  required: boolean;
  children: Item[];
}

export type DiffOp =
  | { op: "added"; path: string; desc: string; line: number }
  | { op: "removed"; path: string; desc: string; line: number }
  | { op: "changed"; path: string; desc: string; before: string; after: string; line: number }
  | { op: "moved"; path: string; from: string; desc: string; line: number };

export interface DiffResult {
  ops: DiffOp[];
  summary: { added: number; removed: number; changed: number; moved: number };
  /** Reasons the change is a regression (non-empty ⇒ exit 1): removed required inputs, newly failing accessibility rules. */
  regressions: string[];
}

const attrSig = (a: Attrs | undefined): string =>
  a === undefined
    ? ""
    : JSON.stringify([
        a.id,
        a.classes,
        Object.entries(a.props).sort(([x], [y]) => x.localeCompare(y)),
      ]);
const isRequired = (a: Attrs | undefined): boolean => a?.props["required"] === true;
const q = (s: string): string => (s.length > 40 ? `"${s.slice(0, 37)}…"` : `"${s}"`);

function inlineItem(n: InlineNode, line: number): Item {
  const mk = (
    kind: string,
    label: string,
    sig: string,
    a?: Attrs,
    children: Item[] = [],
  ): Item => ({
    desc: label === "" ? kind : `${kind} ${q(label)}`,
    kind,
    id: a?.id,
    sig: `${kind}|${sig}|${attrSig(a)}`,
    line,
    required: isRequired(a),
    children,
  });
  switch (n.kind) {
    case "text":
      return mk("text", n.value, n.value);
    case "strong":
    case "em":
      return mk(
        n.kind,
        "",
        "",
        undefined,
        n.children.map((c) => inlineItem(c, line)),
      );
    case "code":
      return mk("code", n.value, n.value);
    case "button":
      return mk("button", n.label, `${n.label}|${n.action ?? ""}`, n.attrs);
    case "link":
      return mk("link", n.label, `${n.label}|${n.target}`, n.attrs);
    case "input":
      return mk("input", n.placeholder, n.placeholder, n.attrs);
    case "image":
      return mk("image", n.description, n.description, n.attrs);
    case "badge":
      return mk("badge", n.label, n.label, n.attrs);
    case "checkbox":
    case "radio":
      return mk(n.kind, n.label, `${n.label}|${n.checked}`, n.attrs);
    case "toggle":
      return mk("toggle", n.label, `${n.label}|${n.on}`, n.attrs);
    case "dropdown":
      return mk(
        "dropdown",
        n.label,
        `${n.label}|${(n.options ?? []).join(",")}|${n.dynamic ?? ""}`,
        n.attrs,
      );
    case "widget":
      return mk(n.widget, n.raw, n.raw, n.attrs);
    case "component":
      return mk(n.name.toLowerCase(), n.raw, n.raw, n.attrs);
    case "binding":
      return mk("binding", n.path, n.path);
    case "use":
      return mk("use", n.path, n.path, n.attrs);
  }
}

function blockItem(n: BlockNode | ListItemNode): Item {
  const line = n.span.start.line;
  const kids = (): Item[] => childrenOf(n).map(blockItem);
  const mk = (
    kind: string,
    label: string,
    sig: string,
    a?: Attrs,
    children: Item[] = [],
  ): Item => ({
    desc: label === "" ? kind : `${kind} ${q(label)}`,
    kind,
    id: a?.id,
    sig: `${kind}|${sig}|${attrSig(a)}`,
    line,
    required: isRequired(a),
    children,
  });
  switch (n.kind) {
    case "line": {
      // a line holding one element IS that element; a mixed line is identified by its text
      const kids = n.inline.map((i) => inlineItem(i, line));
      if (kids.length === 1) return { ...(kids[0] as Item), line };
      return mk("line", "", n.text, undefined, kids);
    }
    case "heading":
      return mk(
        `h${n.level}`,
        n.text,
        n.text,
        undefined,
        n.inline.map((i) => inlineItem(i, line)).filter((c) => c.kind !== "text"),
      );
    case "item":
      return mk("item", "", `${n.ordered}|${n.text}`, undefined, [
        ...n.inline.map((i) => inlineItem(i, line)),
        ...kids(),
      ]);
    case "hint":
      return mk("hint", n.text, n.text);
    case "directive":
      return mk(
        "directive",
        n.tokens.map((t) => `${t.name}: ${t.value}`).join(", "),
        `${n.breakpoint ?? ""}|${n.env.join(",")}|${JSON.stringify(n.tokens)}`,
      );
    case "comment":
      return mk("comment", "", n.text);
    case "divider":
      return mk("divider", n.label ?? "", n.label ?? "");
    case "code":
      return mk("code", n.info, n.text);
    case "tabs":
      return mk("tabs", n.tabs.map((t) => t.label).join(" | "), JSON.stringify(n.tabs));
    case "table":
      return mk("table", n.header.join(" | "), JSON.stringify([n.header, n.rows]), undefined, []);
    case "block":
      return mk(n.name, n.args, n.args, n.attrs, kids());
    case "list":
      return mk("list", "", "", undefined, kids());
    default:
      return mk(n.kind, "", "", n.attrs, kids());
  }
}

/** Sequence of matched indices that keep their relative order (longest increasing subsequence). */
function stableSet(pairs: { a: number; b: number }[]): Set<number> {
  const seq = pairs.slice().sort((x, y) => x.a - y.a);
  const tails: number[] = [];
  const prev: number[] = new Array<number>(seq.length).fill(-1);
  seq.forEach((p, i) => {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((seq[tails[mid] as number] as { b: number }).b < p.b) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0) prev[i] = tails[lo - 1] as number;
    tails[lo] = i;
  });
  const keep = new Set<number>();
  for (let k = tails[tails.length - 1]; k !== undefined && k !== -1; k = prev[k] as number)
    keep.add((seq[k] as { a: number }).a);
  return keep;
}

interface Ctx {
  ops: DiffOp[];
  /** removed/added items awaiting cross-parent move detection */
  removed: { item: Item; path: string }[];
  added: { item: Item; path: string }[];
}

function diffLists(a: Item[], b: Item[], pathA: string, pathB: string, ctx: Ctx): void {
  const mA = new Array<number>(a.length).fill(-1);
  const mB = new Array<number>(b.length).fill(-1);
  const link = (i: number, j: number): void => {
    mA[i] = j;
    mB[j] = i;
  };
  // 1) author ids, 2) exact content, in document order
  a.forEach((x, i) => {
    if (x.id === undefined) return;
    const j = b.findIndex((y, jj) => mB[jj] === -1 && y.id === x.id && y.kind === x.kind);
    if (j !== -1) link(i, j);
  });
  a.forEach((x, i) => {
    if (mA[i] !== -1) return;
    const j = b.findIndex((y, jj) => mB[jj] === -1 && y.sig === x.sig);
    if (j !== -1) link(i, j);
  });
  // 3) same kind, unmatched, in order ⇒ the element changed in place
  a.forEach((x, i) => {
    if (mA[i] !== -1) return;
    const j = b.findIndex(
      (y, jj) => mB[jj] === -1 && y.kind === x.kind && (y.id === undefined || x.id === undefined),
    );
    if (j !== -1 && Math.abs(j - i) <= 2) link(i, j);
  });

  const exact = a.flatMap((x, i) =>
    mA[i] !== -1 && (b[mA[i] as number] as Item).sig === x.sig
      ? [{ a: i, b: mA[i] as number }]
      : [],
  );
  const stable = stableSet(exact);
  a.forEach((x, i) => {
    const j = mA[i] as number;
    if (j === -1) return;
    const y = b[j] as Item;
    const where = `${pathB}${y.desc}`;
    if (x.sig !== y.sig)
      ctx.ops.push({
        op: "changed",
        path: pathB,
        desc: y.desc,
        before: x.desc,
        after: y.desc,
        line: y.line,
      });
    else if (!stable.has(i))
      ctx.ops.push({ op: "moved", path: pathB, from: pathA, desc: y.desc, line: y.line });
    void where;
    diffLists(x.children, y.children, `${pathA}${x.desc} › `, `${pathB}${y.desc} › `, ctx);
  });
  a.forEach((x, i) => {
    if (mA[i] === -1) ctx.removed.push({ item: x, path: pathA });
  });
  b.forEach((y, j) => {
    if (mB[j] === -1) ctx.added.push({ item: y, path: pathB });
  });
}

const count = (it: Item): number => 1 + it.children.reduce((n, c) => n + count(c), 0);

function emit(ctx: Ctx): void {
  // a removed + added pair with identical content is a move across parents, not a delete and an add
  const addedLeft = [...ctx.added];
  for (const r of ctx.removed) {
    const k = addedLeft.findIndex(
      (x) =>
        x.item.sig === r.item.sig &&
        x.item.children.length === r.item.children.length &&
        count(x.item) === count(r.item),
    );
    if (k !== -1 && r.item.kind !== "text") {
      const [x] = addedLeft.splice(k, 1);
      ctx.ops.push({
        op: "moved",
        path: (x as { path: string }).path,
        from: r.path,
        desc: r.item.desc,
        line: (x as { item: Item }).item.line,
      });
    } else ctx.ops.push({ op: "removed", path: r.path, desc: r.item.desc, line: r.item.line });
  }
  for (const x of addedLeft)
    ctx.ops.push({ op: "added", path: x.path, desc: x.item.desc, line: x.item.line });
}

function* required(it: Item, path: string): Generator<string> {
  if (it.required) yield `${path}${it.desc}`;
  for (const c of it.children) yield* required(c, `${path}${it.desc} › `);
}

const topItems = (d: Document): Item[] => d.body.map(blockItem);

/** Diff two sources. Regressions: a removed `required` element, or an accessibility rule that newly fails. */
export function diffDocuments(
  before: Document,
  after: Document,
  opts: { beforeSource?: string; afterSource?: string } = {},
): DiffResult {
  const a = topItems(before);
  const b = topItems(after);
  const ctx: Ctx = { ops: [], removed: [], added: [] };
  diffLists(a, b, "", "", ctx);
  emit(ctx);
  ctx.ops.sort((x, y) => x.line - y.line || x.op.localeCompare(y.op));
  const summary = { added: 0, removed: 0, changed: 0, moved: 0 };
  for (const o of ctx.ops) summary[o.op]++;

  const regressions: string[] = [];
  // removed required elements
  const reqAfter = new Set<string>();
  for (const it of b) for (const p of required(it, "")) reqAfter.add(p);
  for (const op of ctx.ops) {
    if (op.op !== "removed") continue;
    const found = a
      .flatMap((it) => [...required(it, "")])
      .find((p) => p === `${op.path}${op.desc}`);
    if (found !== undefined && !reqAfter.has(found))
      regressions.push(`required element removed: ${op.path}${op.desc}`);
  }
  // newly failing accessibility rules
  if (opts.beforeSource !== undefined && opts.afterSource !== undefined) {
    const a11y = (src: string): Map<string, number> => {
      const m = new Map<string, number>();
      for (const d of lint(src).diagnostics)
        if (d.rule !== undefined && d.severity !== "info" && d.code.startsWith("W3"))
          m.set(d.rule, (m.get(d.rule) ?? 0) + 1);
      return m;
    };
    const was = a11y(opts.beforeSource);
    for (const [rule, n] of a11y(opts.afterSource))
      if (n > (was.get(rule) ?? 0))
        regressions.push(
          `accessibility rule newly failing: ${rule} (${was.get(rule) ?? 0} → ${n})`,
        );
  }
  return { ops: ctx.ops, summary, regressions };
}

export function formatDiff(r: DiffResult): string {
  const sym = { added: "+", removed: "-", changed: "~", moved: ">" } as const;
  const lines = r.ops.map((o) => {
    const where = o.path === "" ? "" : ` in ${o.path.replace(/ › $/, "")}`;
    if (o.op === "changed") return `~ ${o.before} → ${o.after}${where} (line ${o.line})`;
    if (o.op === "moved")
      return `> ${o.desc} moved${o.from === "" ? "" : ` from ${o.from.replace(/ › $/, "")}`} to ${o.path === "" ? "top level" : o.path.replace(/ › $/, "")} (line ${o.line})`;
    return `${sym[o.op]} ${o.desc}${where} (line ${o.line})`;
  });
  lines.push(
    `${r.summary.added} added, ${r.summary.removed} removed, ${r.summary.changed} changed, ${r.summary.moved} moved`,
  );
  for (const g of r.regressions) lines.push(`REGRESSION: ${g}`);
  return lines.join("\n") + "\n";
}
