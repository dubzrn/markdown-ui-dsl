import { altOf, parseFenceInfo, type RenderFenceOptions } from "./fence.js";
import { renderSvg } from "./svg.js";
import { parse } from "@vrillabs/mdui-core";

export interface EmbedOptions extends RenderFenceOptions {
  /** Directory (relative to the Markdown file) the SVGs are written to and linked from. Default `mdui`. */
  dir?: string;
  /** Keep the source in a collapsed `<details>` under the image so the diff and the source stay in the README. */
  keepSource?: boolean;
}
export interface EmbedResult {
  markdown: string;
  /** Relative path → SVG text. */
  files: Record<string, string>;
  warnings: string[];
}

/** Stable 32-bit FNV-1a hash as 8 hex digits (file names must not change when unrelated text does). */
function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * GitHub renders Mermaid natively but not custom fences, so the GitHub-friendly form is a generated `.svg` and an image
 * embed. Replaces every ```` ```mdui ```` fence with `![alt](dir/name.svg)` and returns the SVG files to write.
 */
export function embedMarkdown(markdown: string, o: EmbedOptions = {}): EmbedResult {
  const dir = (o.dir ?? "mdui").replace(/\/+$/, "");
  const files: Record<string, string> = {};
  const warnings: string[] = [];
  const lines = markdown.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const open = /^(\s{0,3})(`{3,}|~{3,})\s*(mdui\b.*)$/.exec(lines[i] as string);
    if (open === null) {
      out.push(lines[i] as string);
      continue;
    }
    const [, indent, fence, info] = open as unknown as [string, string, string, string];
    let j = i + 1;
    const body: string[] = [];
    while (
      j < lines.length &&
      !new RegExp(`^\\s{0,3}${fence[0] === "`" ? "`" : "~"}{${fence.length},}\\s*$`).test(
        lines[j] as string,
      )
    )
      body.push(lines[j++] as string);
    if (j >= lines.length) {
      warnings.push(`line ${i + 1}: unclosed mdui fence left as is`);
      out.push(...lines.slice(i));
      break;
    }
    const src = body.join("\n");
    const f = parseFenceInfo(info, { style: "clean", theme: "auto", output: "svg", ...o.defaults });
    for (const w of f.warnings) warnings.push(`line ${i + 1}: ${w}`);
    const doc = parse(src);
    const svg = renderSvg(doc, {
      style: f.options.style,
      theme: f.options.theme,
      ...(f.options.state !== undefined ? { state: f.options.state } : {}),
      ...(f.options.width !== undefined ? { width: f.options.width } : {}),
    });
    const name = `${dir}/${fnv(`${info.trim()}\n${src}`)}.svg`;
    files[name] = svg;
    const alt = altOf(src).replace(/[[\]]/g, "");
    out.push(`${indent}![${alt}](${name})`);
    if (o.keepSource === true)
      out.push(
        "",
        `${indent}<details><summary>Source</summary>`,
        "",
        `${indent}${fence}${info}`,
        ...body,
        `${indent}${fence}`,
        "",
        `${indent}</details>`,
      );
    i = j;
  }
  return { markdown: out.join("\n"), files, warnings };
}
