import type { Diagnostic, Span } from "./diagnostics.js";
import type { Attrs } from "./attrs.js";
import type { FrontmatterData } from "./frontmatter.js";
import type { InlineNode } from "./inline.js";

export type ContainerKind =
  "column" | "row" | "card" | "modal" | "header" | "footer" | "bubble-user" | "bubble-agent";

interface Base {
  span: Span;
}
export interface ContainerNode extends Base {
  kind: ContainerKind;
  attrs?: Attrs;
  children: BlockNode[];
  /** False when the block was auto-closed at end of file (E1001). */
  closed: boolean;
}
/** DSL 2.0 container with a name and arguments: GRID, REGION, STATE, EACH, IF, … (RFC-0001 §3b/3c). */
export interface NamedBlockNode extends Base {
  kind: "block";
  /** Lower-case kind name, e.g. "grid", "region". */
  name: string;
  /** Raw argument text between the name and the closing `:::`. */
  args: string;
  attrs?: Attrs;
  children: BlockNode[];
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
  breakpoint?: "sm" | "md" | "lg" | "xl";
  /** Environment tokens (`dark`, `touch`, …); only recognised when the document declares `dsl: 2.0`. */
  env: string[];
  tokens: { name: string; value: string }[];
}
export interface CommentNode extends Base {
  kind: "comment";
  text: string;
}
export interface DividerNode extends Base {
  kind: "divider";
  /** `*** Title ***` (DSL 2.0). */
  label?: string;
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
  | NamedBlockNode
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
