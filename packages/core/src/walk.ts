import type { BlockNode, ListItemNode } from "./ast.js";
import type { InlineNode } from "./inline.js";

export interface Visit {
  node: BlockNode | ListItemNode;
  /** Ancestor chain, outermost first (excludes `node`). */
  parents: (BlockNode | ListItemNode)[];
}

/** Depth-first walk over every block (and list item) in document order. */
export function walkBlocks(
  nodes: BlockNode[],
  fn: (v: Visit) => void,
  parents: (BlockNode | ListItemNode)[] = [],
): void {
  for (const node of nodes) {
    fn({ node, parents });
    const kids = childrenOf(node);
    if (kids.length > 0) walkBlocks(kids, fn, [...parents, node]);
  }
}

export function childrenOf(node: BlockNode | ListItemNode): BlockNode[] {
  switch (node.kind) {
    case "list":
      return node.children as unknown as BlockNode[];
    case "item":
      return node.children;
    default:
      return "children" in node ? (node.children as BlockNode[]) : [];
  }
}

/** Inline runs held directly by a node (line text, heading, item text, table cells). */
export function inlinesOf(node: BlockNode | ListItemNode): InlineNode[][] {
  switch (node.kind) {
    case "line":
    case "heading":
    case "item":
      return [node.inline];
    case "table":
      return [...node.headerInline, ...node.rowsInline.flat()];
    default:
      return [];
  }
}

/** Visit inline nodes recursively (descending into strong/em). */
export function walkInline(nodes: InlineNode[], fn: (n: InlineNode) => void): void {
  for (const n of nodes) {
    fn(n);
    if (n.kind === "strong" || n.kind === "em") walkInline(n.children, fn);
  }
}
