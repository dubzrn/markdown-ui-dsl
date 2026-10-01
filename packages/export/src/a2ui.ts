/**
 * A2UI v1.0 exporter (T-090). Targets the basic catalog at google/A2UI commit 102ec1a04975 (schemas vendored under
 * `schemas/a2ui-1.0/`). Output is a message list: `createSurface`, `updateComponents`, and `updateDataModel` when the
 * document binds data. Constructs the basic catalog cannot express are degraded to the nearest component and reported
 * as warnings (docs/EXPORT.md lists each one); comments and hints are author notes, not UI, and are not exported.
 */
import type { BlockNode, Document, InlineNode } from "@mdui/core";
import type { ExportWarning, WarningKind } from "./warnings.js";

export interface A2uiOptions {
  surfaceId?: string;
  /** Which STATE of each REGION to export (default `default`, then the first). */
  state?: string;
  /** Resolved `[use]` includes, keyed by path without a leading `./`. */
  includes?: Map<string, Document>;
}
export interface A2uiResult {
  messages: Record<string, unknown>[];
  warnings: ExportWarning[];
}

export const A2UI_VERSION = "v1.0";
export const A2UI_CATALOG_ID = "https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json";
/** Upstream commit the schemas were taken from. */
export const A2UI_PIN = "102ec1a04975";

type Comp = { id: string; component: string } & Record<string, unknown>;
type Dyn = string | { path: string } | { call: "formatString"; args: { value: string } };

const ICONS = new Set([
  "accountCircle",
  "add",
  "arrowBack",
  "arrowForward",
  "attachFile",
  "calendarToday",
  "call",
  "camera",
  "check",
  "close",
  "delete",
  "download",
  "edit",
  "event",
  "error",
  "fastForward",
  "favorite",
  "favoriteOff",
  "folder",
  "help",
  "home",
  "info",
  "locationOn",
  "lock",
  "lockOpen",
  "mail",
  "menu",
  "moreVert",
  "moreHoriz",
  "notificationsOff",
  "notifications",
  "pause",
  "payment",
  "person",
  "phone",
  "photo",
  "play",
  "print",
  "refresh",
  "rewind",
  "search",
  "send",
  "settings",
  "share",
  "shoppingCart",
  "skipNext",
  "skipPrevious",
  "star",
  "starHalf",
  "starOff",
  "stop",
  "upload",
  "visibility",
  "visibilityOff",
  "volumeDown",
  "volumeMute",
  "volumeOff",
  "volumeUp",
  "warning",
]);

/** `user.items[0].name` → `/user/items/0/name` (JSON Pointer, RFC 6901). */
export function toPointer(path: string): string {
  return (
    "/" +
    path
      .replace(/\[(\d+)\]/g, ".$1")
      .split(".")
      .map((s) => s.replace(/~/g, "~0").replace(/\//g, "~1"))
      .join("/")
  );
}

class Builder {
  comps: Comp[] = [];
  warnings: ExportWarning[] = [];
  paths = new Set<string>();
  private n = 0;
  constructor(
    private readonly opts: A2uiOptions,
    private depth = 0,
  ) {}

  warn(kind: WarningKind, line: number, construct: string, message: string): void {
    this.warnings.push({ kind, line, construct, message });
  }
  add(component: string, props: Record<string, unknown>, id?: string): string {
    const cid = id ?? `c${++this.n}`;
    this.comps.push({ id: cid, component, ...props });
    return cid;
  }
  text(value: Dyn, extra: Record<string, unknown> = {}): string {
    return this.add("Text", { text: value, ...extra });
  }
  column(children: string[], extra: Record<string, unknown> = {}, id?: string): string {
    return this.add("Column", { children, ...extra }, id);
  }

  // ------------------------------------------------------------ text

  /** Markdown-ish string for a run of text-like inline nodes, with `${/path}` for bindings. */
  private run(nodes: InlineNode[]): Dyn {
    let bound = false;
    const one = (n: InlineNode): string => {
      switch (n.kind) {
        case "text":
          return n.value.replace(/\$\{/g, "\\${");
        case "strong":
          return `**${n.children.map(one).join("")}**`;
        case "em":
          return `*${n.children.map(one).join("")}*`;
        case "code":
          return `\`${n.value}\``;
        case "binding":
          bound = true;
          this.paths.add(n.path);
          return `\${${toPointer(n.path)}}`;
        default:
          return "";
      }
    };
    const s = nodes.map(one).join("");
    const only = nodes.length === 1 && nodes[0]?.kind === "binding" ? nodes[0] : undefined;
    if (only !== undefined) return { path: toPointer(only.path) };
    return bound ? { call: "formatString", args: { value: s } } : s;
  }

  inline(nodes: InlineNode[], line: number): string[] {
    const ids: string[] = [];
    let buf: InlineNode[] = [];
    const flush = (): void => {
      if (buf.length === 0) return;
      const v = this.run(buf);
      if (!(typeof v === "string" && v.trim() === "")) ids.push(this.text(v));
      buf = [];
    };
    for (const n of nodes) {
      if (["text", "strong", "em", "code", "binding"].includes(n.kind)) {
        buf.push(n);
        continue;
      }
      flush();
      ids.push(...this.control(n, line));
    }
    flush();
    return ids;
  }

  private label(n: { attrs?: { props: Record<string, string | true> } }, fallback: string): string {
    const l = n.attrs?.props["label"];
    return typeof l === "string" ? l : fallback;
  }

  private control(n: InlineNode, line: number): string[] {
    switch (n.kind) {
      case "button": {
        const a = n.action ?? "";
        const name = a.startsWith("#") ? a.slice(1) : a;
        const action =
          name === "" || /^[a-z][a-z0-9+.-]*:/i.test(a) === false
            ? {
                event: {
                  name: name === "" ? n.label : name,
                  ...(a !== "" && !a.startsWith("#") ? { context: { target: a } } : {}),
                },
              }
            : { functionCall: { call: "openUrl", args: { url: a } } };
        const t = this.text(n.label);
        const primary = n.attrs?.props["primary"] === true;
        return [
          this.add("Button", { child: t, action, ...(primary ? { variant: "primary" } : {}) }),
        ];
      }
      case "link": {
        const t = this.text(n.label);
        const abs = /^(https?:|mailto:|tel:)/i.test(n.target);
        const action = abs
          ? { functionCall: { call: "openUrl", args: { url: n.target } } }
          : { event: { name: "navigate", context: { target: n.target } } };
        if (!abs)
          this.warn(
            "degraded",
            line,
            "[link](relative)",
            `relative target "${n.target}" becomes a "navigate" event: openUrl needs an absolute URI`,
          );
        return [this.add("Button", { child: t, action, variant: "borderless" })];
      }
      case "input": {
        const label = this.label(n, n.placeholder === "" ? "Text input" : n.placeholder);
        const type = n.attrs?.props["type"];
        const variant =
          type === "password" ? "obscured" : type === "number" ? "number" : "shortText";
        return [
          this.add("TextField", {
            label,
            ...(n.placeholder !== "" ? { placeholder: n.placeholder } : {}),
            variant,
          }),
        ];
      }
      case "image":
        this.warn(
          "synthesized",
          line,
          "[ IMG ]",
          "wireframe images have no URL; exported with an empty url and the description as accessible text",
        );
        return [this.add("Image", { url: "", description: n.description })];
      case "badge":
        this.warn(
          "degraded",
          line,
          "badge",
          "no badge component in the basic catalog; exported as caption text",
        );
        return [this.text(n.label, { variant: "caption" })];
      case "checkbox":
        return [this.add("CheckBox", { label: n.label, value: n.checked })];
      case "radio":
        this.warn(
          "degraded",
          line,
          "radio",
          "a lone radio becomes a single-option mutually exclusive ChoicePicker; group radios by hand",
        );
        return [
          this.add("ChoicePicker", {
            label: n.label,
            variant: "mutuallyExclusive",
            options: [{ label: n.label, value: n.label }],
            value: n.checked ? [n.label] : [],
          }),
        ];
      case "toggle":
        this.warn("degraded", line, "toggle", "no switch component; exported as a CheckBox");
        return [this.add("CheckBox", { label: n.label, value: n.on })];
      case "dropdown": {
        if (n.dynamic !== undefined) {
          this.warn(
            "degraded",
            line,
            "dropdown {dynamic}",
            `options come from "${n.dynamic}" at run time; exported with no options`,
          );
        }
        return [
          this.add("ChoicePicker", {
            label: n.label,
            variant: "mutuallyExclusive",
            options: (n.options ?? []).map((o) => ({ label: o, value: o })),
            value: [],
          }),
        ];
      }
      case "use": {
        const doc = this.opts.includes?.get(n.path.replace(/^\.\//, ""));
        if (doc === undefined || this.depth > 8) {
          this.warn("dropped", line, "[use]", `include "${n.path}" could not be resolved`);
          return [];
        }
        const sub = new Builder(this.opts, this.depth + 1);
        sub.n = this.n + 1000 * (this.depth + 1);
        const ids = sub.blocks(doc.body);
        this.comps.push(...sub.comps);
        this.warnings.push(...sub.warnings);
        for (const p of sub.paths) this.paths.add(p);
        return ids;
      }
      case "widget":
        return this.widget(n, line);
      case "component":
        this.warn(
          "degraded",
          line,
          `[ ${n.name} ]`,
          "custom component has no basic-catalog equivalent; exported as its name as text",
        );
        return [this.text(n.raw === "" ? n.name : `${n.name}: ${n.raw}`)];
      default:
        return [];
    }
  }

  private widget(n: Extract<InlineNode, { kind: "widget" }>, line: number): string[] {
    const a = n.args;
    const name = `[ ${n.widget.toUpperCase()} ]`;
    switch (n.widget) {
      case "slider": {
        const m = /^(-?[\d.]+)\.\.(-?[\d.]+)$/.exec(a.positional[0] ?? "");
        const min = Number(m?.[1] ?? 0);
        const max = Number(m?.[2] ?? 100);
        const v = Number(a.named["value"] ?? min);
        return [
          this.add("Slider", {
            label: this.label(n, "Slider"),
            min,
            max,
            value: Number.isFinite(v) ? v : min,
          }),
        ];
      }
      case "date": {
        const raw = n.raw.trim();
        return [
          this.add("DateTimeInput", {
            label: this.label(n, raw === "range" ? "Date range" : "Date"),
            enableDate: true,
            enableTime: false,
            value: /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "",
          }),
        ];
      }
      case "avatar":
        this.warn("synthesized", line, name, "avatar exported as an Image with an empty url");
        return [this.add("Image", { url: "", description: n.raw, variant: "avatar" })];
      case "icon": {
        const i = a.positional[0] ?? "";
        if (ICONS.has(i)) return [this.add("Icon", { name: i })];
        this.warn(
          "degraded",
          line,
          name,
          `icon "${i}" is not in the basic catalog's icon set; exported as text`,
        );
        return [this.text(i)];
      }
      case "progress":
        this.warn("degraded", line, name, "no progress component; exported as text");
        return [this.text(`Progress ${Number.parseInt(n.raw, 10)}%`)];
      case "stat": {
        this.warn(
          "degraded",
          line,
          name,
          "no stat component; exported as a Column of two Text components",
        );
        const [l, v, ...r] = a.positional;
        return [
          this.column([
            this.text(l ?? "", { variant: "caption" }),
            this.text([v ?? "", ...r].join(" ")),
          ]),
        ];
      }
      case "chart":
        this.warn(
          "degraded",
          line,
          name,
          "no chart component in the basic catalog; exported as a text description",
        );
        return [
          this.text(
            `${a.positional[0] ?? "chart"} chart${a.positional[1] !== undefined ? `: ${a.positional[1]}` : ""}`,
          ),
        ];
      case "skeleton":
        this.warn(
          "dropped",
          line,
          name,
          "loading skeletons are a renderer concern in A2UI; nothing exported",
        );
        return [];
      case "file":
        this.warn(
          "degraded",
          line,
          name,
          'no file picker; exported as a Button whose event is "pick-file"',
        );
        return [
          this.add("Button", {
            child: this.text(n.raw || "Choose file"),
            action: { event: { name: "pick-file" } },
          }),
        ];
      case "crumbs":
      case "stepper":
      case "pager":
      case "menubar": {
        this.warn(
          "degraded",
          line,
          name,
          `no ${n.widget} component; exported as a Row of text/buttons`,
        );
        const parts = n.raw
          .split(n.widget === "menubar" ? /[\s]*[|,][\s]*/ : n.widget === "pager" ? /\// : />/)
          .map((s) => s.trim().replace(/^\*(.*)\*$/, "$1"))
          .filter(Boolean);
        const kids = parts.map((p) =>
          n.widget === "menubar"
            ? this.add("Button", {
                child: this.text(p),
                action: { event: { name: p } },
                variant: "borderless",
              })
            : this.text(p),
        );
        return [this.add("Row", { children: kids })];
      }
    }
  }

  // ------------------------------------------------------------ blocks

  blocks(nodes: BlockNode[]): string[] {
    return nodes.flatMap((n) => this.block(n));
  }

  private wrap(children: BlockNode[]): string {
    const ids = this.blocks(children);
    return this.column(ids);
  }

  private block(n: BlockNode): string[] {
    const line = n.span.start.line;
    switch (n.kind) {
      case "column":
        return [this.column(this.blocks(n.children))];
      case "row":
        return [this.add("Row", { children: this.blocks(n.children) })];
      case "card":
        return [this.add("Card", { child: this.wrap(n.children) })];
      case "header":
      case "footer": {
        this.warn(
          "degraded",
          line,
          n.kind.toUpperCase(),
          "no banner/contentinfo landmark in A2UI; exported as a Row (the renderer decides semantics)",
        );
        return [this.add("Row", { children: this.blocks(n.children) })];
      }
      case "bubble-user":
      case "bubble-agent":
        this.warn("degraded", line, "bubble", "chat bubble exported as a Card");
        return [this.add("Card", { child: this.wrap(n.children) })];
      case "modal": {
        this.warn(
          "synthesized",
          line,
          "MODAL",
          'A2UI Modal needs a trigger; a Button "Open" was added',
        );
        const trigger = this.add("Button", {
          child: this.text("Open"),
          action: { event: { name: "open-modal" } },
        });
        return [this.add("Modal", { trigger, content: this.wrap(n.children) })];
      }
      case "heading": {
        const v = this.run(n.inline);
        const hashes = "#".repeat(Math.min(n.level, 6));
        this.warn(
          "degraded",
          line,
          `h${n.level}`,
          "the basic catalog has no heading level; exported as Markdown heading text",
        );
        return [this.text(typeof v === "string" ? `${hashes} ${v}` : v)];
      }
      case "line":
        return this.inline(n.inline, line);
      case "divider":
        return [
          this.add("Divider", { axis: "horizontal" }),
          ...(n.label !== undefined ? [this.text(n.label, { variant: "caption" })] : []),
        ];
      case "code":
        return [this.text("```" + n.info + "\n" + n.text + "\n```")];
      case "tabs": {
        this.warn(
          "degraded",
          line,
          "tabs",
          "the DSL tab row carries no per-tab content; exported as a Row of borderless Buttons",
        );
        const kids = n.tabs.map((t) =>
          this.add("Button", {
            child: this.text(t.label),
            action: { event: { name: "select-tab", context: { tab: t.label } } },
            variant: t.active ? "primary" : "borderless",
          }),
        );
        return [this.add("Row", { children: kids })];
      }
      case "table": {
        this.warn(
          "degraded",
          line,
          "table",
          "no table component; exported as a Column of Rows of Text (header first)",
        );
        const row = (cells: string[]): string =>
          this.add("Row", { children: cells.map((c) => this.text(c)) });
        return [this.column([row(n.header), ...n.rows.map(row)])];
      }
      case "list":
        return [
          this.column(
            n.children.flatMap((item, i) => {
              const ids = this.inline(item.inline, line);
              const kids = this.blocks(item.children);
              const marker = this.text(item.ordered ? `${i + 1}.` : "•");
              return [this.add("Row", { children: [marker, ...ids, ...kids] })];
            }),
          ),
        ];
      case "block":
        return this.named(n);
      case "hint":
      case "comment":
        return []; // author notes, not UI
      case "directive":
        this.warn(
          "dropped",
          line,
          "responsive directive",
          "A2UI has no breakpoint or environment directives; ignored",
        );
        return [];
    }
  }

  private named(n: Extract<BlockNode, { kind: "block" }>): string[] {
    const line = n.span.start.line;
    const args = n.args.trim();
    switch (n.name) {
      case "grid": {
        const cols = Math.min(
          Math.max(Number.parseInt(/cols=(\d+)/.exec(args)?.[1] ?? "2", 10), 1),
          12,
        );
        this.warn("degraded", line, "GRID", `no grid component; exported as ${cols}-wide Rows`);
        const ids = this.blocks(n.children);
        const rows: string[] = [];
        for (let i = 0; i < ids.length; i += cols)
          rows.push(this.add("Row", { children: ids.slice(i, i + cols), justify: "spaceBetween" }));
        return [this.column(rows)];
      }
      case "region": {
        const states = n.children.filter(
          (c): c is Extract<BlockNode, { kind: "block" }> =>
            c.kind === "block" && c.name === "state",
        );
        const chosen =
          states.find((s) => s.args.trim() === (this.opts.state ?? "default")) ??
          states.find((s) => s.args.trim() === "default") ??
          states[0];
        for (const s of states)
          if (s !== chosen)
            this.warn(
              "dropped",
              s.span.start.line,
              `STATE ${s.args.trim()}`,
              "only one STATE per REGION is exported; re-run with --state to export another",
            );
        const rest = n.children.filter((c) => !(c.kind === "block" && c.name === "state"));
        return [
          this.column([
            ...this.blocks(rest),
            ...(chosen === undefined ? [] : this.blocks(chosen.children)),
          ]),
        ];
      }
      case "state":
        return [];
      case "each":
        this.warn(
          "degraded",
          line,
          "EACH",
          "A2UI templates need a component per item bound to a list path; the body is exported once, unbound",
        );
        return [this.column(this.blocks(n.children))];
      case "if":
        this.warn(
          "degraded",
          line,
          "IF",
          `conditions are not exported; the body is always shown (condition: ${args})`,
        );
        return [this.column(this.blocks(n.children))];
      case "panel": {
        this.warn(
          "degraded",
          line,
          "PANEL",
          "no collapsible component; exported as a Card with a title",
        );
        const title = /^"([^"]*)"/.exec(args)?.[1] ?? args.replace(/\bopen\b/, "").trim();
        return [
          this.add("Card", {
            child: this.column([
              this.text(title, { variant: "caption" }),
              ...this.blocks(n.children),
            ]),
          }),
        ];
      }
      case "group": {
        const title = /^"([^"]*)"/.exec(args)?.[1] ?? args;
        this.warn("degraded", line, "GROUP", "no fieldset; exported as a titled Column");
        return [
          this.column([this.text(title, { variant: "caption" }), ...this.blocks(n.children)]),
        ];
      }
      case "toast":
      case "tooltip":
      case "callout":
      case "empty":
      case "drawer":
      case "tree":
      case "accordion":
      default:
        this.warn(
          "degraded",
          line,
          n.name.toUpperCase(),
          "no equivalent in the basic catalog; the body is exported in a Column",
        );
        return [this.column(this.blocks(n.children))];
    }
  }
}

/** Nest `a.b[0]` paths into an object of `""` placeholders. */
function placeholders(paths: Set<string>): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const p of [...paths].sort()) {
    const segs = p.replace(/\[(\d+)\]/g, ".$1").split(".");
    let cur: Record<string, unknown> = root;
    segs.forEach((s, i) => {
      if (i === segs.length - 1) {
        if (!(s in cur)) cur[s] = "";
      } else {
        const next = cur[s];
        if (typeof next !== "object" || next === null) cur[s] = {};
        cur = cur[s] as Record<string, unknown>;
      }
    });
  }
  return root;
}

export function exportA2ui(doc: Document, opts: A2uiOptions = {}): A2uiResult {
  const b = new Builder(opts);
  const kids = b.blocks(doc.body);
  b.comps.unshift({ id: "root", component: "Column", children: kids });
  const surfaceId = opts.surfaceId ?? "surface-1";
  const messages: Record<string, unknown>[] = [
    { version: A2UI_VERSION, createSurface: { surfaceId, catalogId: A2UI_CATALOG_ID } },
    { version: A2UI_VERSION, updateComponents: { surfaceId, components: b.comps } },
  ];
  if (b.paths.size > 0) {
    b.warn(
      "synthesized",
      1,
      "{binding}",
      "bound paths get empty-string placeholders in updateDataModel; supply real data at run time",
    );
    messages.push({
      version: A2UI_VERSION,
      updateDataModel: { surfaceId, value: placeholders(b.paths) },
    });
  }
  return { messages, warnings: b.warnings.sort((x, y) => x.line - y.line) };
}
