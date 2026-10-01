import type {
  Attrs,
  BlockNode,
  DirectiveNode,
  Document,
  InlineNode,
  ListItemNode,
} from "@mdui/core";
import { splitMenu } from "@mdui/core";
import { esc, safeUrl } from "./escape.js";
import { stylesheet, type StyleName } from "./styles.js";

export interface RenderOptions {
  style?: StyleName;
  /** Which STATE each REGION shows (default `default`; falls back to the first state). */
  state?: string;
  theme?: "auto" | "light" | "dark";
  /** Emit only the `<main>` element (no document shell, no stylesheet). */
  fragment?: boolean;
  /** Resolved partials by include path (see `analyze().includes`), expanded in place of `[[ USE ]]`. */
  includes?: ReadonlyMap<string, Document>;
  /** Document title override. */
  title?: string;
}

interface Ctx {
  state: string;
  includes: ReadonlyMap<string, Document>;
  depth: number;
}

function attrString(
  a: Attrs | undefined,
  base: {
    classes?: string[];
    extra?: Record<string, string | true | undefined>;
    skip?: string[];
  } = {},
): string {
  const parts: string[] = [];
  const classes = [...(base.classes ?? []), ...(a?.classes ?? [])];
  if (a?.id !== undefined) parts.push(`id="${esc(a.id)}"`);
  if (classes.length > 0) parts.push(`class="${esc(classes.join(" "))}"`);
  const put = (k: string, v: string | true): void =>
    void parts.push(v === true ? k : `${k}="${esc(v)}"`);
  const skip = new Set(base.skip ?? []);
  for (const [k, v] of Object.entries(base.extra ?? {})) if (v !== undefined) put(k, v);
  for (const [k, v] of Object.entries(a?.props ?? {})) {
    if (skip.has(k)) continue;
    if (v === "false") continue;
    switch (k) {
      case "label":
      case "alt":
        put("aria-label", v);
        break;
      case "hint":
        put("data-hint", v);
        break;
      case "error":
        put("aria-invalid", "true");
        put("data-error", v);
        break;
      case "live":
        put("aria-live", v);
        break;
      case "role":
        put("role", v);
        break;
      case "required":
        put("required", true);
        put("aria-required", "true");
        break;
      case "readonly":
      case "disabled":
        put(k, true);
        break;
      case "primary":
      case "destructive":
      case "terminal":
        put(`data-${k}`, true);
        break;
      case "scroll":
        put("data-scroll", v);
        break;
      case "lang":
      case "dir":
      case "type":
      case "min":
      case "max":
      case "step":
      case "pattern":
      case "maxlength":
      case "autocomplete":
        put(k, v);
        break;
      default:
        put(k.startsWith("data-") ? k : `data-attr-${k}`, v);
    }
  }
  return parts.length === 0 ? "" : ` ${parts.join(" ")}`;
}

/** Responsive/environment directives declared inside a block apply to that block (SKILL.md semantics). */
function directiveAttrs(children: BlockNode[]): string {
  const parts: string[] = [];
  for (const c of children) {
    if (c.kind !== "directive") continue;
    const d: DirectiveNode = c;
    const scope = [...(d.breakpoint !== undefined ? [d.breakpoint] : []), ...d.env].join("-");
    for (const t of d.tokens) parts.push(`data-bp-${esc(scope)}-${esc(t.name)}="${esc(t.value)}"`);
  }
  return parts.length === 0 ? "" : ` ${parts.join(" ")}`;
}

// ---------------------------------------------------------------- inline

function inline(nodes: InlineNode[], ctx: Ctx): string {
  return nodes.map((n) => inlineNode(n, ctx)).join("");
}

function inlineNode(n: InlineNode, ctx: Ctx): string {
  switch (n.kind) {
    case "text":
      return esc(n.value);
    case "strong":
      return `<strong>${inline(n.children, ctx)}</strong>`;
    case "em":
      return `<em>${inline(n.children, ctx)}</em>`;
    case "code":
      return `<code>${esc(n.value)}</code>`;
    case "button":
      return `<button type="button"${attrString(n.attrs, {
        extra: {
          "data-action": n.action?.startsWith("#") ? n.action.slice(1) : undefined,
          "data-href":
            n.action !== undefined && !n.action.startsWith("#") && n.action !== ""
              ? safeUrl(n.action)
              : undefined,
        },
      })}>${esc(n.label)}</button>`;
    case "link":
      return `<a href="${esc(safeUrl(n.target))}"${attrString(n.attrs)}>${esc(n.label)}</a>`;
    case "input": {
      const label = n.attrs?.props["label"];
      const aria =
        typeof label === "string"
          ? ""
          : ` aria-label="${esc(n.placeholder === "" ? "Text input" : n.placeholder)}"`;
      return `<input type="text" placeholder="${esc(n.placeholder)}"${aria}${attrString(n.attrs)}>`;
    }
    case "image": {
      const alt = n.attrs?.props["alt"];
      const label = typeof alt === "string" ? alt : n.description;
      return `<span class="mdui-img" role="img" aria-label="${esc(label)}"${attrString(n.attrs, { skip: ["alt"] })}>${esc(n.description)}</span>`;
    }
    case "badge":
      return `<span class="mdui-badge"${attrString(n.attrs)}>${esc(n.label)}</span>`;
    case "checkbox":
      return `<label><input type="checkbox"${n.checked ? " checked" : ""}${attrString(n.attrs)}> ${esc(n.label)}</label>`;
    case "radio":
      return `<label><input type="radio"${n.checked ? " checked" : ""}${attrString(n.attrs)}> ${esc(n.label)}</label>`;
    case "toggle":
      return `<button type="button" role="switch" aria-checked="${n.on}" aria-label="${esc(n.label)}"${attrString(n.attrs)}>${esc(n.label)}: ${n.on ? "on" : "off"}</button>`;
    case "dropdown": {
      const opts = n.options ?? (n.dynamic !== undefined ? [`(dynamic: ${n.dynamic})`] : []);
      const all = [n.label, ...opts.filter((o) => o !== n.label)];
      return `<select aria-label="${esc(n.label)}"${attrString(n.attrs)}>${all.map((o, i) => `<option${i === 0 ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
    }
    case "binding":
      return `<span class="mdui-binding" data-path="${esc(n.path)}">{{ ${esc(n.path)} }}</span>`;
    case "use": {
      const doc = ctx.includes.get(n.path.replace(/^\.\//, ""));
      if (doc === undefined || ctx.depth > 8)
        return `<div class="mdui-use" data-path="${esc(n.path)}">include: ${esc(n.path)}</div>`;
      return `<div class="mdui-use" data-path="${esc(n.path)}">${blocks(doc.body, { ...ctx, depth: ctx.depth + 1 })}</div>`;
    }
    case "widget":
      return widget(n, ctx);
    case "component":
      return `<div class="mdui-use" data-component="${esc(n.name)}"${attrString(n.attrs)}>${esc(n.name)}${n.raw === "" ? "" : `: ${esc(n.raw)}`}</div>`;
  }
}

function widget(n: Extract<InlineNode, { kind: "widget" }>, ctx: Ctx): string {
  void ctx;
  const a = n.args;
  const at = (skip: string[] = []): string => attrString(n.attrs, { skip });
  switch (n.widget) {
    case "slider": {
      const m = /^(-?[\d.]+)\.\.(-?[\d.]+)$/.exec(a.positional[0] ?? "");
      return `<input type="range" min="${esc(m?.[1] ?? "0")}" max="${esc(m?.[2] ?? "100")}"${a.named["step"] !== undefined ? ` step="${esc(a.named["step"])}"` : ""}${a.named["value"] !== undefined ? ` value="${esc(a.named["value"])}"` : ""} aria-label="Slider"${at()}>`;
    }
    case "date":
      return `<input type="date"${/^\d{4}-\d{2}-\d{2}$/.test(n.raw.trim()) ? ` value="${esc(n.raw.trim())}"` : ""} aria-label="${n.raw.trim() === "range" ? "Date range" : "Date"}"${at()}>`;
    case "file":
      return `<label>${esc(n.raw)} <input type="file"${at()}></label>`;
    case "progress": {
      const v = Number.parseInt(n.raw, 10);
      return `<progress value="${v}" max="100" aria-label="Progress ${v}%"${at()}>${v}%</progress>`;
    }
    case "chart":
      return `<figure class="mdui-chart" role="img" aria-label="${esc(`${a.positional[0] ?? "chart"} chart${a.positional[1] !== undefined ? `: ${a.positional[1]}` : ""}`)}" data-data="${esc(a.named["data"] ?? "")}"${at()}>${esc(`${a.positional[0] ?? "chart"} chart${a.positional[1] !== undefined ? ` · ${a.positional[1]}` : ""}`)}</figure>`;
    case "stat": {
      const [label, value, ...rest] = a.positional;
      return `<dl class="mdui-stat"${at()}><dt>${esc(label ?? "")}</dt><dd>${esc(value ?? "")}${rest.length > 0 ? ` <small>${esc(rest.join(" "))}</small>` : ""}</dd></dl>`;
    }
    case "skeleton": {
      const rows = Number.parseInt(a.named["rows"] ?? "3", 10);
      return `<div role="status" aria-label="Loading"${at()}>${'<div class="mdui-skeleton" aria-hidden="true"></div>'.repeat(Math.min(Math.max(rows, 1), 50))}</div>`;
    }
    case "avatar":
      return `<span class="mdui-img" role="img" aria-label="${esc(n.raw)}"${at()}>${esc(n.raw.split(/\s+/)[0] ?? "")}</span>`;
    case "icon":
      return `<span class="mdui-icon" aria-hidden="true" data-icon="${esc(a.positional[0] ?? "")}"${at()}>◆</span>`;
    case "crumbs":
      return `<nav aria-label="Breadcrumb"${at()}><ol class="mdui-row" style="list-style:none;padding:0;margin:0">${n.raw
        .split(">")
        .map((s) => s.trim())
        .filter(Boolean)
        .map(
          (s, i, all) =>
            `<li${i === all.length - 1 ? ' aria-current="page"' : ""}>${esc(s.replace(/^\*(.*)\*$/, "$1"))}</li>`,
        )
        .join("")}</ol></nav>`;
    case "pager": {
      const [cur, total] = n.raw.trim().split("/");
      return `<nav aria-label="Pagination"${at()}>Page <span aria-current="page">${esc(cur ?? "")}</span> of ${esc(total ?? "")}</nav>`;
    }
    case "stepper": {
      const steps = n.raw
        .split(">")
        .map((s) => s.trim())
        .filter(Boolean);
      return `<ol class="mdui-row" style="list-style:none;padding:0"${at()}>${steps
        .map(
          (s, i) =>
            `<li${/^\*.*\*$/.test(s) ? ' aria-current="step"' : ""}>${i + 1}. ${esc(s.replace(/^\*(.*)\*$/, "$1"))}</li>`,
        )
        .join("")}</ol>`;
    }
    case "menubar":
      return `<div role="menubar" class="mdui-row"${at()}>${splitMenu(n.raw)
        .map(
          (m, i) =>
            `<button type="button" role="menuitem" tabindex="${i === 0 ? 0 : -1}">${esc(m)}</button>`,
        )
        .join("")}</div>`;
  }
}

// ---------------------------------------------------------------- blocks

function blocks(nodes: BlockNode[], ctx: Ctx): string {
  return nodes
    .map((n) => block(n, ctx))
    .filter((s) => s !== "")
    .join("\n");
}

function listItem(item: ListItemNode, ctx: Ctx): string {
  const own = item.inline.length > 0 ? inline(item.inline, ctx) : "";
  const kids = blocks(item.children, ctx);
  return `<li>${own}${kids === "" ? "" : `\n${kids}`}</li>`;
}

function block(n: BlockNode, ctx: Ctx): string {
  switch (n.kind) {
    case "column":
      return `<div class="mdui-col"${attrString(n.attrs)}${directiveAttrs(n.children)}>\n${blocks(n.children, ctx)}\n</div>`;
    case "row":
      return `<div class="mdui-row"${attrString(n.attrs)}${directiveAttrs(n.children)}>\n${blocks(n.children, ctx)}\n</div>`;
    case "card":
      return `<section class="mdui-card"${attrString(n.attrs)}${directiveAttrs(n.children)}>\n${blocks(n.children, ctx)}\n</section>`;
    case "modal":
      return `<dialog open class="mdui-modal" role="dialog" aria-modal="true"${attrString(n.attrs)}${directiveAttrs(n.children)}>\n${blocks(n.children, ctx)}\n</dialog>`;
    case "header":
      return `<header class="mdui-header"${attrString(n.attrs)}${directiveAttrs(n.children)}>\n${blocks(n.children, ctx)}\n</header>`;
    case "footer":
      return `<footer class="mdui-footer"${attrString(n.attrs)}${directiveAttrs(n.children)}>\n${blocks(n.children, ctx)}\n</footer>`;
    case "bubble-user":
    case "bubble-agent": {
      const who = n.kind === "bubble-user" ? "user" : "agent";
      return `<div class="mdui-bubble mdui-bubble--${who}" role="group" aria-label="${who === "user" ? "User" : "Agent"} message"${attrString(n.attrs)}${directiveAttrs(n.children)}>\n${blocks(n.children, ctx)}\n</div>`;
    }
    case "block":
      return named(n, ctx);
    case "line":
      return `<p>${inline(n.inline, ctx)}</p>`;
    case "heading":
      return `<h${n.level}>${inline(n.inline, ctx)}</h${n.level}>`;
    case "hint":
      return `<!-- hint: ${esc(n.text).replace(/--/g, "- -")} -->`;
    case "directive":
      return ""; // applied to the enclosing block by directiveAttrs
    case "comment":
      return "";
    case "divider":
      return n.label === undefined
        ? "<hr>"
        : `<div class="mdui-divider" role="separator"><span>${esc(n.label)}</span></div>`;
    case "code":
      return `<pre><code${n.info !== "" ? ` class="language-${esc(n.info.split(/\s+/)[0] ?? "")}"` : ""}>${esc(n.text)}</code></pre>`;
    case "tabs":
      return `<div class="mdui-tabs" role="tablist">${n.tabs.map((t) => `<button type="button" role="tab" aria-selected="${t.active}"${t.active ? "" : ' tabindex="-1"'}>${esc(t.label)}</button>`).join("")}</div>`;
    case "table": {
      const align = (i: number): string => {
        const a = n.align[i];
        return a === undefined || a === "none" ? "" : ` data-align="${a}"`;
      };
      const head = n.headerInline
        .map((c, i) => `<th scope="col"${align(i)}>${inline(c, ctx)}</th>`)
        .join("");
      const body = n.rowsInline
        .map((r) => `<tr>${r.map((c, i) => `<td${align(i)}>${inline(c, ctx)}</td>`).join("")}</tr>`)
        .join("\n");
      return `<table>\n<thead><tr>${head}</tr></thead>\n<tbody>\n${body}\n</tbody>\n</table>`;
    }
    case "list": {
      const ordered = n.children[0]?.ordered === true;
      const tag = ordered ? "ol" : "ul";
      return `<${tag}>\n${n.children.map((i) => listItem(i, ctx)).join("\n")}\n</${tag}>`;
    }
  }
}

function named(n: Extract<BlockNode, { kind: "block" }>, ctx: Ctx): string {
  const kids = (c: Ctx = ctx): string => blocks(n.children, c);
  const dir = directiveAttrs(n.children);
  const at = (classes: string[], extra: Record<string, string | true | undefined> = {}): string =>
    attrString(n.attrs, { classes, extra }) + dir;
  const args = n.args.trim();
  switch (n.name) {
    case "grid": {
      const cols = Number.parseInt(/cols=(\d+)/.exec(args)?.[1] ?? "2", 10);
      return `<div${at(["mdui-grid"])} style="grid-template-columns:repeat(${Math.min(Math.max(cols, 1), 12)},minmax(0,1fr))">\n${kids()}\n</div>`;
    }
    case "accordion":
      return `<div${at(["mdui-col"])}>\n${kids()}\n</div>`;
    case "panel": {
      const title = /^"([^"]*)"/.exec(args)?.[1] ?? args.replace(/\bopen\b/, "").trim();
      return `<details${/\bopen\b/.test(args.replace(/^"[^"]*"/, "")) ? " open" : ""}${at(["mdui-card"])}><summary>${esc(title)}</summary>\n${kids()}\n</details>`;
    }
    case "drawer":
      return `<aside${at(["mdui-drawer"], { "data-side": /side=(\w+)/.exec(args)?.[1] })} aria-label="Drawer">\n${kids()}\n</aside>`;
    case "toast":
      return `<div${at(["mdui-toast"], { "data-kind": /kind=(\w+)/.exec(args)?.[1] })} role="status">\n${kids()}\n</div>`;
    case "tooltip":
      return `<div${at(["mdui-callout"], { "data-for": /for=#?([\w-]+)/.exec(args)?.[1] })} role="tooltip">\n${kids()}\n</div>`;
    case "callout":
      return `<aside${at(["mdui-callout"], { "data-kind": args.split(/\s+/)[0] })} role="note">\n${kids()}\n</aside>`;
    case "empty":
      return `<div${at(["mdui-empty"])}>\n${kids()}\n</div>`;
    case "tree":
      return `<div${at(["mdui-tree"])} role="tree">\n${kids()}\n</div>`;
    case "group": {
      const title = /^"([^"]*)"/.exec(args)?.[1] ?? args;
      return `<fieldset${at(["mdui-group"])}><legend>${esc(title)}</legend>\n${kids()}\n</fieldset>`;
    }
    case "region": {
      const states = n.children.filter(
        (c): c is Extract<BlockNode, { kind: "block" }> => c.kind === "block" && c.name === "state",
      );
      const chosen =
        states.find((s) => s.args.trim() === ctx.state) ??
        states.find((s) => s.args.trim() === "default") ??
        states[0];
      const rest = n.children.filter((c) => !(c.kind === "block" && c.name === "state"));
      const inner = [
        blocks(rest, ctx),
        chosen === undefined
          ? ""
          : `<div data-state="${esc(chosen.args.trim())}"${attrString(chosen.attrs)}>\n${blocks(chosen.children, ctx)}\n</div>`,
      ]
        .filter(Boolean)
        .join("\n");
      return `<div${at(["mdui-region"], { "data-region": args })}>\n${inner}\n</div>`;
    }
    case "state":
      return ""; // rendered by its REGION
    case "each":
      return `<div${at(["mdui-col"], { "data-each": args })}>\n${kids()}\n</div>`;
    case "if":
      return `<div${at(["mdui-col"], { "data-if": args })}>\n${kids()}\n</div>`;
    default:
      return `<div${at(["mdui-col"], { "data-unknown-block": n.name })}>\n${kids()}\n</div>`;
  }
}

function firstHeading(nodes: BlockNode[]): string | undefined {
  for (const n of nodes) if (n.kind === "heading") return n.text;
  return undefined;
}

/** Render a parsed document to HTML. Never throws; all text and attribute values are escaped. */
export function render(doc: Document, opts: RenderOptions = {}): string {
  const style = opts.style ?? "clean";
  const ctx: Ctx = {
    state: opts.state ?? "default",
    includes: opts.includes ?? new Map(),
    depth: 0,
  };
  const lang = typeof doc.meta["lang"] === "string" ? doc.meta["lang"] : "en";
  const dir = doc.meta["dir"] === "rtl" ? "rtl" : "ltr";
  // In a full document, a top-level leading HEADER / trailing FOOTER sits outside <main>, so the browser exposes it as the
  // banner / contentinfo landmark (a <header> inside <main> is not one). Fragments keep everything in <main>.
  const nodes = doc.body;
  let from = 0;
  let to = nodes.length;
  if (opts.fragment !== true) {
    const isBlank = (n: BlockNode): boolean => n.kind === "comment" || n.kind === "directive";
    while (from < to && (nodes[from]?.kind === "header" || isBlank(nodes[from] as BlockNode)))
      from++;
    while (to > from && (nodes[to - 1]?.kind === "footer" || isBlank(nodes[to - 1] as BlockNode)))
      to--;
    if (!nodes.slice(0, from).some((n) => n.kind === "header")) from = 0;
    if (!nodes.slice(to).some((n) => n.kind === "footer")) to = nodes.length;
  }
  const scope = `class="mdui mdui-style-${style}" data-theme="${opts.theme ?? "auto"}"`;
  const outside = (list: BlockNode[]): string =>
    list.length === 0 ? "" : `<div ${scope}>\n${blocks(list, ctx)}\n</div>\n`;
  const head = outside(nodes.slice(0, from));
  const foot = outside(nodes.slice(to));
  const body = blocks(nodes.slice(from, to), ctx);
  const theme = opts.theme ?? "auto";
  const main =
    `${head}<main class="mdui mdui-style-${style}" data-theme="${theme}"${directiveAttrs(doc.body)}>\n${body}\n</main>\n${foot}`.trimEnd();
  if (opts.fragment === true) return main;
  const title =
    opts.title ??
    (typeof doc.meta["title"] === "string" ? doc.meta["title"] : undefined) ??
    firstHeading(doc.body) ??
    "Wireframe";
  const caption =
    typeof doc.meta["caption"] === "string"
      ? `<p class="mdui-caption" style="text-align:center;font-size:.85em">${esc(doc.meta["caption"])}</p>`
      : "";
  return `<!doctype html>
<html lang="${esc(lang)}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${style === "none" ? "" : `<style>${stylesheet(style)}</style>`}
</head>
<body style="margin:0;background:${theme === "dark" ? "#14141a" : "#fff"}">
${main}
${caption}
</body>
</html>
`;
}
