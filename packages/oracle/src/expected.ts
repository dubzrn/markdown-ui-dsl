/**
 * AST to expected accessibility tree (T-076). The mapping is fixed and documented in docs/ORACLE.md.
 * Output is a flat, document-ordered list: matching is on role, accessible name and order, not on nesting.
 */
import {
  walkInline,
  type BlockNode,
  type Document,
  type InlineNode,
  type ListItemNode,
  type Span,
} from "@vrillabs/mdui-core";

export type Kind = "interactive" | "heading" | "landmark" | "text";

export interface Expected {
  role: string;
  /** Accessible name; empty when the role has none. */
  name: string;
  kind: Kind;
  /** Default weights: interactive 3, heading 2, landmark 2, text 1. */
  weight: number;
  level?: number;
  /** Spec line, for reports. */
  line: number;
}

export const DEFAULT_WEIGHTS: Record<Kind, number> = {
  interactive: 3,
  heading: 2,
  landmark: 2,
  text: 1,
};

export interface ExpectOptions {
  /** Which STATE of each REGION is expected (default: `default`, else the first state). */
  state?: string;
  weights?: Partial<Record<Kind, number>>;
  /**
   * Name for a text input that has no `label=`: `placeholder` (default) uses the placeholder text as the name,
   * `none` expects no name (a placeholder is not a label).
   */
  inputName?: "placeholder" | "none";
  /** Include plain paragraph text as `text` items (weight 1). Default true. */
  text?: boolean;
}

const norm = (s: string): string => s.replace(/\s+/g, " ").trim();
const plain = (nodes: InlineNode[]): string =>
  norm(
    nodes
      .map((n): string => {
        switch (n.kind) {
          case "text":
          case "code":
            return n.value;
          case "strong":
          case "em":
            return plain(n.children);
          default:
            return "";
        }
      })
      .join(""),
  );

type Node = BlockNode | ListItemNode;

/**
 * Which top-level HEADER / FOOTER blocks are page landmarks (banner / contentinfo): the leading headers and trailing
 * footers of the document, ignoring comments and directives. A HEADER anywhere else is a section header: HTML gives
 * it no landmark role, so none is expected.
 */
function pageLandmarks(body: BlockNode[]): Set<BlockNode> {
  const skip = (n: BlockNode): boolean => n.kind === "comment" || n.kind === "directive";
  const set = new Set<BlockNode>();
  let i = 0;
  while (i < body.length && (body[i]?.kind === "header" || skip(body[i] as BlockNode))) {
    if (body[i]?.kind === "header") set.add(body[i] as BlockNode);
    i++;
  }
  let j = body.length - 1;
  while (j >= i && (body[j]?.kind === "footer" || skip(body[j] as BlockNode))) {
    if (body[j]?.kind === "footer") set.add(body[j] as BlockNode);
    j--;
  }
  return set;
}

export function expectedTree(doc: Document, opts: ExpectOptions = {}): Expected[] {
  const w = { ...DEFAULT_WEIGHTS, ...opts.weights };
  const landmarks = pageLandmarks(doc.body);
  const out: Expected[] = [];
  const add = (role: string, name: string, kind: Kind, line: number, level?: number): void => {
    out.push({
      role,
      name: norm(name),
      kind,
      weight: w[kind],
      line,
      ...(level !== undefined ? { level } : {}),
    });
  };
  const inline = (run: InlineNode[], line: number): void => {
    for (const n of run)
      walkInline([n], (x) => {
        switch (x.kind) {
          case "button":
            add("button", x.label, "interactive", line);
            break;
          case "link":
            add("link", x.label, "interactive", line);
            break;
          case "input": {
            const label = x.attrs?.props["label"];
            const name =
              typeof label === "string" ? label : opts.inputName === "none" ? "" : x.placeholder;
            add("textbox", name, "interactive", line);
            break;
          }
          case "checkbox":
            add("checkbox", x.label, "interactive", line);
            break;
          case "radio":
            add("radio", x.label, "interactive", line);
            break;
          case "toggle":
            add("switch", x.label, "interactive", line);
            break;
          case "dropdown":
            add("combobox", x.label, "interactive", line);
            break;
          case "image":
            add("img", x.description, "interactive", line);
            break;
          case "widget":
            if (x.widget === "slider")
              add("slider", x.args.named["label"] ?? "", "interactive", line);
            break;
        }
      });
  };
  const visit = (nodes: Node[]): void => {
    for (const n of nodes) {
      const line = (n.span as Span).start.line;
      switch (n.kind) {
        case "header":
          if (landmarks.has(n)) add("banner", "", "landmark", line);
          visit(n.children);
          break;
        case "footer":
          if (landmarks.has(n)) add("contentinfo", "", "landmark", line);
          visit(n.children);
          break;
        case "modal":
          add("dialog", "", "landmark", line);
          visit(n.children);
          break;
        case "block": {
          if (n.name === "region") {
            const states = n.children.filter((c) => c.kind === "block" && c.name === "state");
            const want = opts.state ?? "default";
            const chosen =
              states.find((s) => s.kind === "block" && s.args.trim().split(/\s+/)[0] === want) ??
              states[0];
            visit(
              chosen !== undefined
                ? (chosen as { children: Node[] }).children
                : n.children.filter((c) => !(c.kind === "block" && c.name === "state")),
            );
          } else if (n.name === "state") {
            // reached only outside a region: ignore
          } else visit(n.children);
          break;
        }
        case "heading":
          add("heading", plain(n.inline), "heading", line, n.level);
          break;
        case "line":
          inline(n.inline, line);
          if (opts.text !== false) {
            const t = plain(n.inline);
            if (
              t !== "" &&
              !n.inline.some(
                (x) =>
                  x.kind !== "text" && x.kind !== "strong" && x.kind !== "em" && x.kind !== "code",
              )
            ) {
              add("text", t, "text", line);
            }
          }
          break;
        case "item":
          inline(n.inline, line);
          visit(n.children);
          break;
        case "list":
          add("list", "", "landmark", line);
          visit(n.children as unknown as Node[]);
          break;
        case "tabs":
          add("tablist", "", "landmark", line);
          for (const t of n.tabs) add("tab", t.label, "interactive", line);
          break;
        case "table":
          add("table", "", "landmark", line);
          for (const run of [...n.headerInline, ...n.rowsInline.flat()]) inline(run, line);
          break;
        default:
          if ("children" in n) visit(n.children as Node[]);
      }
    }
  };
  visit(doc.body);
  return out;
}

/** Playwright-compatible ARIA snapshot template (order-correct; names quoted). */
export function toAriaYaml(items: readonly Expected[]): string {
  const q = (s: string): string => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  return (
    items
      .map(
        (i) =>
          `- ${i.role}${i.name !== "" ? ` ${q(i.name)}` : ""}${i.level !== undefined ? ` [level=${i.level}]` : ""}`,
      )
      .join("\n") + "\n"
  );
}
