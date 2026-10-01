/** The ```` ```mdui ```` fence: info-string options and rendering. */
import { analyze, parse, type Document } from "@mdui/core";
import { render, stylesheet } from "@mdui/render";
import { escapeXml, renderSvg, type SvgStyle } from "./svg.js";

export interface FenceOptions {
  style: SvgStyle;
  theme: "auto" | "light" | "dark";
  state?: string;
  width?: number;
  /** `svg` (self-contained, default) or `html` (semantic markup from @mdui/render, with its stylesheet). */
  output: "svg" | "html";
}
export interface FenceInfo {
  /** True when the info string is `mdui` optionally followed by options. */
  matches: boolean;
  options: FenceOptions;
  /** Options that were ignored, with the reason. */
  warnings: string[];
}

const DEFAULTS: FenceOptions = { style: "clean", theme: "auto", output: "svg" };

/** `mdui style=sketch state=loading theme=dark width=480 output=html` */
export function parseFenceInfo(info: string, base: FenceOptions = DEFAULTS): FenceInfo {
  const parts = info.trim().split(/\s+/);
  const out: FenceInfo = { matches: parts[0] === "mdui", options: { ...base }, warnings: [] };
  if (!out.matches) return out;
  for (const p of parts.slice(1)) {
    const m = /^([a-z]+)=(.*)$/.exec(p);
    if (m === null) {
      out.warnings.push(`ignored "${p}" (expected key=value)`);
      continue;
    }
    const [, k, v] = m as unknown as [string, string, string];
    if (k === "style" && ["sketch", "clean", "wireframe"].includes(v))
      out.options.style = v as SvgStyle;
    else if (k === "theme" && ["auto", "light", "dark"].includes(v))
      out.options.theme = v as FenceOptions["theme"];
    else if (k === "output" && ["svg", "html"].includes(v))
      out.options.output = v as "svg" | "html";
    else if (k === "state" && /^[\w-]{1,40}$/.test(v)) out.options.state = v;
    else if (k === "width" && /^\d{3,4}$/.test(v)) out.options.width = Number(v);
    else out.warnings.push(`ignored ${k}=${v}`);
  }
  return out;
}

function includesOf(
  doc: Document,
  read?: (path: string) => string | undefined,
): Map<string, Document> {
  const m = new Map<string, Document>();
  if (read === undefined) return m;
  for (const i of analyze(doc, { file: "embedded.ui.md", readFile: read }).includes)
    if (i.path !== undefined && i.doc !== undefined) m.set(i.path, i.doc);
  return m;
}

export interface RenderFenceOptions {
  /** Resolves `[[ USE: path ]]` includes; without it includes render as placeholders. */
  readFile?: (path: string) => string | undefined;
  /** Overrides applied after the info string. */
  defaults?: Partial<FenceOptions>;
}

/** Render the body of an `mdui` fence to an HTML string (an inline `<svg>` or a `<div>` fragment). Never throws. */
export function renderFence(source: string, info = "mdui", o: RenderFenceOptions = {}): string {
  const opts = parseFenceInfo(info, { ...DEFAULTS, ...o.defaults }).options;
  const doc = parse(source);
  const includes = includesOf(doc, o.readFile);
  if (opts.output === "html") {
    const html = render(doc, {
      style: opts.style,
      theme: opts.theme,
      includes,
      fragment: true,
      ...(opts.state !== undefined ? { state: opts.state } : {}),
    });
    return `<div class="mdui-embed"><style>${stylesheet(opts.style)}</style>${html}</div>`;
  }
  return renderSvg(doc, {
    style: opts.style,
    theme: opts.theme,
    includes,
    ...(opts.state !== undefined ? { state: opts.state } : {}),
    ...(opts.width !== undefined ? { width: opts.width } : {}),
  }).trimEnd();
}

/** Text for an image `alt`: the document title, else its first heading, else "Wireframe". */
export function altOf(source: string): string {
  const doc = parse(source);
  const t = doc.meta["title"];
  if (typeof t === "string") return t;
  const h = doc.body.find((b) => b.kind === "heading");
  return h?.kind === "heading" ? h.text : "Wireframe";
}
export { escapeXml };
