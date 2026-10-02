/**
 * Adapters for markdown-it, remark and rehype. They are structural: no markdown library is imported, so `@vrillabs/mdui-embed`
 * adds no dependency and works with any version whose node shapes match.
 */
import { renderFence, type RenderFenceOptions } from "./fence.js";

// ---- markdown-it ----------------------------------------------------------------------------------------------------

interface MdToken {
  info: string;
  content: string;
}
type FenceRule = (
  tokens: MdToken[],
  idx: number,
  options: unknown,
  env: unknown,
  self: unknown,
) => string;
interface MarkdownItLike {
  renderer: { rules: { fence?: FenceRule } };
}

/** `md.use(markdownItMdui)`; fences whose info string starts with `mdui` become an inline SVG (or HTML). */
export function markdownItMdui(md: MarkdownItLike, opts: RenderFenceOptions = {}): void {
  const prev = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const t = tokens[idx] as MdToken;
    if (t.info.trim().split(/\s+/)[0] === "mdui")
      return `${renderFence(t.content, t.info, opts)}\n`;
    return prev !== undefined ? prev(tokens, idx, options, env, self) : "";
  };
}

// ---- remark (mdast) -------------------------------------------------------------------------------------------------

interface MdastNode {
  type: string;
  lang?: string | null;
  meta?: string | null;
  value?: string;
  children?: MdastNode[];
}

/** `unified().use(remarkParse).use(remarkMdui).use(remarkRehype, { allowDangerousHtml: true }).use(rehypeStringify, { allowDangerousHtml: true })` */
export function remarkMdui(opts: RenderFenceOptions = {}): (tree: MdastNode) => void {
  const visit = (n: MdastNode): void => {
    if (n.children === undefined) return;
    n.children = n.children.map((c) => {
      if (c.type === "code" && c.lang === "mdui")
        return { type: "html", value: renderFence(c.value ?? "", `mdui ${c.meta ?? ""}`, opts) };
      visit(c);
      return c;
    });
  };
  return (tree) => visit(tree);
}

// ---- rehype (hast) --------------------------------------------------------------------------------------------------

interface HastNode {
  type: string;
  tagName?: string;
  properties?: { className?: string[] | string; [k: string]: unknown };
  children?: HastNode[];
  value?: string;
  data?: { meta?: string };
}
const classes = (n: HastNode): string[] => {
  const c = n.properties?.className;
  return Array.isArray(c) ? c : typeof c === "string" ? c.split(/\s+/) : [];
};
const textOf = (n: HastNode): string =>
  n.type === "text" ? (n.value ?? "") : (n.children ?? []).map(textOf).join("");

/** For pipelines that reach hast without remark's `code` nodes: replaces `<pre><code class="language-mdui">` with raw HTML. Needs `allowDangerousHtml`. */
export function rehypeMdui(opts: RenderFenceOptions = {}): (tree: HastNode) => void {
  const visit = (n: HastNode): void => {
    if (n.children === undefined) return;
    n.children = n.children.map((c) => {
      if (c.type === "element" && c.tagName === "pre") {
        const code = (c.children ?? []).find((x) => x.type === "element" && x.tagName === "code");
        if (code !== undefined && classes(code).includes("language-mdui"))
          return {
            type: "raw",
            value: renderFence(textOf(code), `mdui ${code.data?.meta ?? ""}`, opts),
          };
      }
      visit(c);
      return c;
    });
  };
  return (tree) => visit(tree);
}

declare const DOMParser: new () => {
  parseFromString(s: string, type: string): { documentElement: unknown };
};

// ---- Obsidian -------------------------------------------------------------------------------------------------------

interface ObsidianPluginLike {
  registerMarkdownCodeBlockProcessor(
    lang: string,
    handler: (source: string, el: { appendChild(n: unknown): unknown }) => void,
  ): unknown;
}
/**
 * Registers an `mdui` code-block processor. The SVG is parsed with `DOMParser` (no `innerHTML`). **Not tested against a
 * real Obsidian**: only the structural contract above is assumed.
 */
export function registerObsidianMdui(
  plugin: ObsidianPluginLike,
  opts: RenderFenceOptions = {},
): void {
  plugin.registerMarkdownCodeBlockProcessor("mdui", (source, el) => {
    const svg = renderFence(source, "mdui", {
      ...opts,
      defaults: { ...opts.defaults, output: "svg" },
    });
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    el.appendChild(doc.documentElement);
  });
}
