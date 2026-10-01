import type { Diagnostic, Span } from "./diagnostics.js";
import type { FrontmatterData } from "./frontmatter.js";
import type { InlineNode } from "./inline.js";

export type ContainerKind =
  "column" | "row" | "card" | "modal" | "header" | "footer" | "bubble-user" | "bubble-agent";

interface Base {
  span: Span;
}
export interface ContainerNode extends Base {
  kind: ContainerKind;
  children: BlockNode[];
  /** False when the block was auto-closed at end of file (E1001). */
  closed: boolean;
}
export interface FrontmatterNode extends Base {
  kind: "frontmatter";
  raw: string;
}
export interface LineNode extends Base {
  kind: "line";
  text: string;
  inline: InlineNode[];
}
export interface HeadingNode extends Base {
  kind: "heading";
  level: number;
  text: string;
  inline: InlineNode[];
}
export interface HintNode extends Base {
  kind: "hint";
  text: string;
}
export interface DirectiveNode extends Base {
  kind: "directive";
  breakpoint: "sm" | "md" | "lg" | "xl";
  tokens: { name: string; value: string }[];
}
export interface CommentNode extends Base {
  kind: "comment";
  text: string;
}
export interface DividerNode extends Base {
  kind: "divider";
}
export interface CodeNode extends Base {
  kind: "code";
  info: string;
  text: string;
}
export interface TabsNode extends Base {
  kind: "tabs";
  tabs: { label: string; active: boolean }[];
}
export interface TableNode extends Base {
  kind: "table";
  header: string[];
  rows: string[][];
  headerInline: InlineNode[][];
  rowsInline: InlineNode[][][];
}
export interface ListItemNode extends Base {
  kind: "item";
  ordered: boolean;
  text: string;
  inline: InlineNode[];
  /** Nested blocks: a layout block opened on the item line, and/or a nested list. */
  children: BlockNode[];
}
export interface ListNode extends Base {
  kind: "list";
  children: ListItemNode[];
}

export type BlockNode =
  | ContainerNode
  | LineNode
  | HeadingNode
  | HintNode
  | DirectiveNode
  | CommentNode
  | DividerNode
  | CodeNode
  | TabsNode
  | TableNode
  | ListNode;

export interface Document {
  frontmatter: FrontmatterNode | undefined;
  /** Parsed frontmatter keys (empty when there is none). */
  meta: FrontmatterData;
  /** DSL major: absent `dsl:` ⇒ "1" (RFC-0001 §6). */
  dsl: "1" | "2.0";
  body: BlockNode[];
  diagnostics: Diagnostic[];
}
