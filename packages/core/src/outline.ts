import type { BlockNode, Document, ListItemNode } from "./ast.js";

/**
 * Language-neutral structural summary used by the conformance corpus (T-013):
 * `frontmatter,column(card(line,hint),row())`. Leaves have no parentheses; empty containers print `()`.
 */
export function outline(doc: Document): string {
  const parts: string[] = [];
  if (doc.frontmatter !== undefined) parts.push("frontmatter");
  for (const n of doc.body) parts.push(node(n));
  return parts.join(",");
}

function node(n: BlockNode | ListItemNode): string {
  switch (n.kind) {
    case "column":
    case "row":
    case "card":
    case "modal":
    case "header":
    case "footer":
    case "bubble-user":
    case "bubble-agent":
      return `${n.kind}(${n.children.map(node).join(",")})`;
    case "block":
      return `${n.name}(${n.children.map(node).join(",")})`;
    case "list":
      return `list(${n.children.map(node).join(",")})`;
    case "item":
      return n.children.length === 0 ? "item" : `item(${n.children.map(node).join(",")})`;
    default:
      return n.kind;
  }
}
