/** Sync units of a `.ui.md` spec (T-070): which nodes are units, their items, and stable anchors. */
import {
  parse,
  walkInline,
  type BlockNode,
  type Document,
  type InlineNode,
  type ListItemNode,
  type Span,
} from "@vrillabs/mdui-core";
import { norm, type Item } from "./fingerprint.js";

export interface SpecUnit {
  /** Explicit `{: #id }` anchor, or undefined until one is assigned. */
  explicit: string | undefined;
  kind: string;
  node: BlockNode | undefined;
  span: Span | undefined;
  /** Items directly in this unit (nested units excluded), with spec source lines. */
  items: Item[];
  /** Index path from the document root, for tree matching. */
  path: number[];
  /** Parent unit index, or -1. */
  parent: number;
}

const UNIT_BLOCKS = new Set([
  "region",
  "drawer",
  "panel",
  "group",
  "callout",
  "toast",
  "accordion",
]);
const UNIT_KINDS = new Set(["card", "modal", "header", "footer"]);

function unitKind(n: BlockNode | ListItemNode): string | undefined {
  if (n.kind === "block")
    return UNIT_BLOCKS.has(n.name)
      ? n.name
      : "attrs" in n && n.attrs?.id !== undefined
        ? n.name
        : undefined;
  if (UNIT_KINDS.has(n.kind)) return n.kind;
  if ((n.kind === "column" || n.kind === "row") && n.attrs?.id !== undefined) return n.kind;
  return undefined;
}

function itemsOf(n: InlineNode, line: number, out: Item[]): void {
  walkInline([n], (x) => {
    switch (x.kind) {
      case "button":
        out.push({ role: "button", label: norm(x.label), line });
        break;
      case "link":
        out.push({ role: "link", label: norm(x.label), href: x.target, line });
        break;
      case "input": {
        const label = x.attrs?.props["label"];
        out.push({
          role: "textbox",
          label: norm(typeof label === "string" ? label : x.placeholder),
          line,
        });
        break;
      }
      case "checkbox":
        out.push({ role: "checkbox", label: norm(x.label), line });
        break;
      case "radio":
        out.push({ role: "radio", label: norm(x.label), line });
        break;
      case "toggle":
        out.push({ role: "switch", label: norm(x.label), line });
        break;
      case "dropdown":
        out.push({ role: "combobox", label: norm(x.label), line });
        break;
      case "image":
        out.push({ role: "img", label: norm(x.description), line });
        break;
    }
  });
}

/** All sync units of a document, in document order; unit 0 is the page (items outside any unit). */
export function specUnits(source: string): { doc: Document; units: SpecUnit[] } {
  const doc = parse(source);
  const units: SpecUnit[] = [
    {
      explicit: undefined,
      kind: "page",
      node: undefined,
      span: undefined,
      items: [],
      path: [],
      parent: -1,
    },
  ];
  const visit = (nodes: (BlockNode | ListItemNode)[], owner: number, path: number[]): void => {
    nodes.forEach((n, i) => {
      const p = [...path, i];
      let here = owner;
      const k = unitKind(n);
      if (k !== undefined && n.kind !== "item") {
        const id = "attrs" in n ? n.attrs?.id : undefined;
        units.push({
          explicit: id,
          kind: k,
          node: n,
          span: n.span,
          items: [],
          path: p,
          parent: owner,
        });
        here = units.length - 1;
      }
      const line = n.span.start.line;
      const u = units[here] as SpecUnit;
      if (n.kind === "heading")
        u.items.push({ role: "heading", label: norm(n.text), level: n.level, line });
      if (n.kind === "line" || n.kind === "item")
        for (const x of n.inline) itemsOf(x, line, u.items);
      if (n.kind === "table")
        [...n.headerInline, ...n.rowsInline.flat()].forEach((run) =>
          run.forEach((x) => itemsOf(x, line, u.items)),
        );
      if (n.kind === "tabs")
        n.tabs.forEach((t) => u.items.push({ role: "button", label: norm(t.label), line }));
      const kids: (BlockNode | ListItemNode)[] =
        n.kind === "list"
          ? (n.children as unknown as ListItemNode[])
          : "children" in n
            ? (n.children as (BlockNode | ListItemNode)[])
            : [];
      visit(kids, here, p);
    });
  };
  visit(doc.body, 0, []);
  return { doc, units };
}
