import {
  inlinesOf,
  walkBlocks,
  walkInline,
  type BlockNode,
  type Document,
  type InlineNode,
  type ListItemNode,
  type Span,
} from "@mdui/core";

export type AnyBlock = BlockNode | ListItemNode;

/** Visit every inline node with the block (and its span) that holds it. */
export function eachInline(
  doc: Document,
  fn: (n: InlineNode, owner: AnyBlock, span: Span) => void,
): void {
  walkBlocks(doc.body, ({ node }) => {
    const spanOf = (rowOffset = 0): Span =>
      node.kind === "table" && rowOffset > 0
        ? {
            start: { ...node.span.start, line: node.span.start.line + 1 + rowOffset },
            end: { ...node.span.start, line: node.span.start.line + 1 + rowOffset },
          }
        : node.span;
    if (node.kind === "table") {
      node.headerInline.forEach((run) => walkInline(run, (n) => fn(n, node, node.span)));
      node.rowsInline.forEach((row, k) =>
        row.forEach((run) => walkInline(run, (n) => fn(n, node, spanOf(k + 1)))),
      );
    } else for (const run of inlinesOf(node)) walkInline(run, (n) => fn(n, node, node.span));
  });
}

/** Plain text of an inline run (for names and link text). */
export function textOf(nodes: InlineNode[]): string {
  return nodes
    .map((n): string => {
      switch (n.kind) {
        case "text":
        case "code":
          return n.value;
        case "strong":
        case "em":
          return textOf(n.children);
        case "button":
        case "link":
        case "badge":
        case "checkbox":
        case "radio":
        case "toggle":
        case "dropdown":
          return n.label;
        default:
          return "";
      }
    })
    .join("");
}

/** Last source line covered by a node, including everything nested in it. */
export function lastLine(n: AnyBlock): number {
  let end = n.span.end.line;
  walkBlocks([n as BlockNode], ({ node }) => {
    end = Math.max(end, node.span.end.line);
  });
  return end;
}

export function isContainer(n: AnyBlock): boolean {
  return (
    n.kind === "column" ||
    n.kind === "row" ||
    n.kind === "card" ||
    n.kind === "modal" ||
    n.kind === "header" ||
    n.kind === "footer" ||
    n.kind === "bubble-user" ||
    n.kind === "bubble-agent" ||
    n.kind === "block"
  );
}
