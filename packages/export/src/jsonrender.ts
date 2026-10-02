/**
 * json-render exporter (T-091). json-render has no fixed component set: a spec refers to components of a catalog the
 * application defines. This exporter therefore emits both a flat `spec` (root key, element map, seed state) and the
 * `catalog` it assumes (component names with prop shapes, plus the action names it uses). Output is validated in tests
 * with json-render's own `validateSpec` (@json-render/core 0.21.0). Constructs without a counterpart are reported.
 */
import type { BlockNode, Document, InlineNode } from "@vrillabs/mdui-core";
import { toPointer } from "./a2ui.js";
import { classifyTarget } from "./targets.js";
import type { ExportWarning, WarningKind } from "./warnings.js";

export interface JsonRenderOptions {
  /** Resolved `[use]` includes, keyed by path without a leading `./`. */
  includes?: Map<string, Document>;
}
type Visible = Record<string, unknown> | boolean;
export interface JrElement {
  type: string;
  props: Record<string, unknown>;
  children?: string[];
  visible?: Visible;
  on?: Record<string, { action: string; params?: Record<string, unknown> }>;
  repeat?: { statePath: string };
}
export interface JrSpec {
  root: string;
  elements: Record<string, JrElement>;
  state?: Record<string, unknown>;
}
export interface JrCatalog {
  name: string;
  components: Record<string, { description: string; props: Record<string, string> }>;
  actions: Record<string, { description: string; params: Record<string, string> }>;
}
export interface JsonRenderResult {
  spec: JrSpec;
  catalog: JrCatalog;
  warnings: ExportWarning[];
}

export const JSON_RENDER_PIN = "@json-render/core@0.21.0";

const COMPONENTS: JrCatalog["components"] = {
  Stack: {
    description: "Flex container",
    props: { direction: "'vertical'|'horizontal'", "gap?": "number", "label?": "string" },
  },
  Grid: { description: "CSS grid", props: { columns: "number" } },
  Card: { description: "Bordered container", props: { "title?": "string" } },
  Modal: { description: "Dialog shown over the page", props: { "title?": "string" } },
  Banner: { description: "Page header or footer region", props: { role: "'header'|'footer'" } },
  Heading: { description: "Heading", props: { level: "1-6", text: "DynamicString" } },
  Text: {
    description: "Body text (Markdown-lite)",
    props: { text: "DynamicString", "variant?": "'body'|'caption'" },
  },
  Button: {
    description: "Button",
    props: { label: "string", "variant?": "'default'|'primary'|'destructive'" },
  },
  Link: { description: "Link", props: { label: "string", href: "string" } },
  TextField: {
    description: "Text input",
    props: { label: "string", "placeholder?": "string", "type?": "string", "statePath?": "string" },
  },
  Checkbox: { description: "Checkbox", props: { label: "string", checked: "boolean" } },
  Radio: { description: "Radio", props: { label: "string", checked: "boolean" } },
  Switch: { description: "Toggle", props: { label: "string", checked: "boolean" } },
  Select: { description: "Dropdown", props: { label: "string", options: "string[]" } },
  Slider: {
    description: "Range slider",
    props: { label: "string", min: "number", max: "number", value: "number" },
  },
  DatePicker: { description: "Date input", props: { label: "string", "value?": "string" } },
  Image: { description: "Image placeholder", props: { alt: "string" } },
  Icon: { description: "Icon by name", props: { name: "string" } },
  Badge: { description: "Small label", props: { label: "string" } },
  Divider: { description: "Separator", props: { "label?": "string" } },
  Code: { description: "Code block", props: { language: "string", text: "string" } },
  Tabs: { description: "Tab row", props: { labels: "string[]", active: "number" } },
  Table: { description: "Table", props: { columns: "string[]", rows: "string[][]" } },
  List: { description: "List; children are items", props: { ordered: "boolean" } },
  Group: { description: "Titled group", props: { title: "string" } },
  Placeholder: {
    description: "Stand-in for a construct with no component",
    props: { kind: "string", text: "string" },
  },
};
const ACTIONS: JrCatalog["actions"] = {
  navigate: { description: "Go to a target", params: { target: "string" } },
  submit: { description: "Dispatch a named event", params: { name: "string" } },
  openUrl: { description: "Open an absolute URL", params: { url: "string" } },
};

type Dyn = string | { $state: string } | { $item: string } | { $template: string };

class Builder {
  els: Record<string, JrElement> = {};
  warnings: ExportWarning[] = [];
  state: Record<string, unknown> = {};
  private n = 0;
  /** Inside EACH: the loop variable, whose paths become `$item` / `${field}`. */
  private item: string | undefined;
  constructor(
    private readonly opts: JsonRenderOptions,
    private depth = 0,
  ) {}

  warn(kind: WarningKind, line: number, construct: string, message: string): void {
    this.warnings.push({ kind, line, construct, message });
  }
  add(type: string, props: Record<string, unknown>, extra: Partial<JrElement> = {}): string {
    const key = `e${++this.n + this.depth * 1000}`;
    this.els[key] = { type, props, ...extra };
    return key;
  }
  private ref(path: string): { state?: string; item?: string } {
    if (this.item !== undefined && (path === this.item || path.startsWith(`${this.item}.`)))
      return { item: path === this.item ? "" : path.slice(this.item.length + 1) };
    this.seed(path);
    return { state: toPointer(path) };
  }
  private seed(path: string, value: unknown = ""): void {
    const segs = path.replace(/\[(\d+)\]/g, ".$1").split(".");
    let cur = this.state;
    segs.forEach((s, i) => {
      if (i === segs.length - 1) {
        if (!(s in cur) || (Array.isArray(value) && cur[s] === "")) cur[s] = value;
      } else {
        if (typeof cur[s] !== "object" || cur[s] === null) cur[s] = {};
        cur = cur[s] as Record<string, unknown>;
      }
    });
  }
  private run(nodes: InlineNode[]): Dyn {
    let templated = false;
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
        case "binding": {
          templated = true;
          const r = this.ref(n.path);
          return r.state !== undefined ? `\${${r.state}}` : `\${${r.item ?? ""}}`;
        }
        default:
          return "";
      }
    };
    const only = nodes.length === 1 && nodes[0]?.kind === "binding" ? nodes[0] : undefined;
    if (only !== undefined) {
      const r = this.ref(only.path);
      return r.state !== undefined ? { $state: r.state } : { $item: r.item ?? "" };
    }
    const s = nodes.map(one).join("");
    return templated ? { $template: s } : s;
  }
  private label(n: { attrs?: { props: Record<string, string | true> } }, fallback: string): string {
    const l = n.attrs?.props["label"];
    return typeof l === "string" ? l : fallback;
  }

  inline(nodes: InlineNode[], line: number): string[] {
    const keys: string[] = [];
    let buf: InlineNode[] = [];
    const flush = (): void => {
      if (buf.length === 0) return;
      const v = this.run(buf);
      if (!(typeof v === "string" && v.trim() === "")) keys.push(this.add("Text", { text: v }));
      buf = [];
    };
    for (const n of nodes) {
      if (["text", "strong", "em", "code", "binding"].includes(n.kind)) buf.push(n);
      else {
        flush();
        keys.push(...this.control(n, line));
      }
    }
    flush();
    return keys;
  }

  private control(n: InlineNode, line: number): string[] {
    switch (n.kind) {
      case "button": {
        const a = n.action ?? "";
        const kind = a === "" ? "fragment" : classifyTarget(a);
        if (kind === "unsafe")
          this.warn(
            "dropped",
            line,
            "[ button ](unsafe)",
            `target "${a.slice(0, 40)}" has a scheme that is never exported; the button keeps its label as event name and carries no target`,
          );
        const on =
          a === "" || kind === "unsafe"
            ? { press: { action: "submit", params: { name: n.label } } }
            : a.startsWith("#")
              ? { press: { action: "submit", params: { name: a.slice(1) } } }
              : kind === "url"
                ? { press: { action: "openUrl", params: { url: a } } }
                : { press: { action: "navigate", params: { target: a } } };
        return [
          this.add(
            "Button",
            {
              label: n.label,
              ...(n.attrs?.props["primary"] === true
                ? { variant: "primary" }
                : n.attrs?.props["destructive"] === true
                  ? { variant: "destructive" }
                  : {}),
            },
            { on },
          ),
        ];
      }
      case "link": {
        if (classifyTarget(n.target) === "unsafe") {
          this.warn(
            "dropped",
            line,
            "[link](unsafe)",
            `target "${n.target.slice(0, 40)}" has a scheme that is never exported; exported as plain text`,
          );
          return [this.add("Text", { text: n.label })];
        }
        return [this.add("Link", { label: n.label, href: n.target })];
      }
      case "input": {
        const t = n.attrs?.props["type"];
        return [
          this.add("TextField", {
            label: this.label(n, n.placeholder === "" ? "Text input" : n.placeholder),
            ...(n.placeholder !== "" ? { placeholder: n.placeholder } : {}),
            ...(typeof t === "string" ? { type: t } : {}),
          }),
        ];
      }
      case "image":
        return [this.add("Image", { alt: n.description })];
      case "badge":
        return [this.add("Badge", { label: n.label })];
      case "checkbox":
        return [this.add("Checkbox", { label: n.label, checked: n.checked })];
      case "radio":
        return [this.add("Radio", { label: n.label, checked: n.checked })];
      case "toggle":
        return [this.add("Switch", { label: n.label, checked: n.on })];
      case "dropdown":
        if (n.dynamic !== undefined)
          this.warn(
            "degraded",
            line,
            "dropdown {dynamic}",
            `options come from "${n.dynamic}" at run time; exported with no options`,
          );
        return [this.add("Select", { label: n.label, options: n.options ?? [] })];
      case "use": {
        const doc = this.opts.includes?.get(n.path.replace(/^\.\//, ""));
        if (doc === undefined || this.depth > 8) {
          this.warn("dropped", line, "[use]", `include "${n.path}" could not be resolved`);
          return [];
        }
        const sub = new Builder(this.opts, this.depth + 1);
        sub.item = this.item;
        const keys = sub.blocks(doc.body);
        Object.assign(this.els, sub.els);
        this.warnings.push(...sub.warnings);
        deepFill(this.state, sub.state);
        return keys;
      }
      case "widget": {
        const a = n.args;
        switch (n.widget) {
          case "slider": {
            const m = /^(-?[\d.]+)\.\.(-?[\d.]+)$/.exec(a.positional[0] ?? "");
            const min = Number(m?.[1] ?? 0);
            return [
              this.add("Slider", {
                label: this.label(n, "Slider"),
                min,
                max: Number(m?.[2] ?? 100),
                value: Number(a.named["value"] ?? min),
              }),
            ];
          }
          case "date": {
            const raw = n.raw.trim();
            return [
              this.add("DatePicker", {
                label: this.label(n, raw === "range" ? "Date range" : "Date"),
                ...(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? { value: raw } : {}),
              }),
            ];
          }
          case "icon":
            return [this.add("Icon", { name: a.positional[0] ?? "" })];
          case "avatar":
            return [this.add("Image", { alt: n.raw })];
          default:
            this.warn(
              "degraded",
              line,
              `[ ${n.widget.toUpperCase()} ]`,
              "no component in the mdui catalog; exported as a Placeholder carrying the raw arguments",
            );
            return [this.add("Placeholder", { kind: n.widget, text: n.raw })];
        }
      }
      case "component":
        this.warn("degraded", line, `[ ${n.name} ]`, "custom component; exported as a Placeholder");
        return [this.add("Placeholder", { kind: n.name, text: n.raw })];
      default:
        return [];
    }
  }

  blocks(nodes: BlockNode[]): string[] {
    return nodes.flatMap((n) => this.block(n));
  }
  private stack(
    children: BlockNode[],
    direction: "vertical" | "horizontal",
    extra: Partial<JrElement> = {},
  ): string {
    const kids = this.blocks(children);
    return this.add("Stack", { direction }, { ...extra, children: kids });
  }

  private block(n: BlockNode): string[] {
    const line = n.span.start.line;
    switch (n.kind) {
      case "column":
        return [this.stack(n.children, "vertical")];
      case "row":
        return [this.stack(n.children, "horizontal")];
      case "card":
        return [this.add("Card", {}, { children: this.blocks(n.children) })];
      case "modal":
        return [this.add("Modal", {}, { children: this.blocks(n.children) })];
      case "header":
      case "footer":
        return [this.add("Banner", { role: n.kind }, { children: this.blocks(n.children) })];
      case "bubble-user":
      case "bubble-agent":
        this.warn("degraded", line, "bubble", "chat bubble exported as a Card");
        return [
          this.add(
            "Card",
            { title: n.kind === "bubble-user" ? "User" : "Agent" },
            { children: this.blocks(n.children) },
          ),
        ];
      case "heading":
        return [this.add("Heading", { level: n.level, text: this.run(n.inline) })];
      case "line":
        return this.inline(n.inline, line);
      case "divider":
        return [this.add("Divider", n.label !== undefined ? { label: n.label } : {})];
      case "code":
        return [this.add("Code", { language: n.info.split(/\s+/)[0] ?? "", text: n.text })];
      case "tabs":
        return [
          this.add("Tabs", {
            labels: n.tabs.map((t) => t.label),
            active: Math.max(
              0,
              n.tabs.findIndex((t) => t.active),
            ),
          }),
        ];
      case "table":
        return [this.add("Table", { columns: n.header, rows: n.rows })];
      case "list":
        return [
          this.add(
            "List",
            { ordered: n.children[0]?.ordered === true },
            {
              children: n.children.map((i) =>
                this.add(
                  "Stack",
                  { direction: "horizontal" },
                  { children: [...this.inline(i.inline, line), ...this.blocks(i.children)] },
                ),
              ),
            },
          ),
        ];
      case "block":
        return this.named(n);
      case "hint":
      case "comment":
        return [];
      case "directive":
        this.warn(
          "dropped",
          line,
          "responsive directive",
          "json-render has no breakpoint or environment directives; ignored",
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
        return [this.add("Grid", { columns: cols }, { children: this.blocks(n.children) })];
      }
      case "region": {
        const states = n.children.filter(
          (c): c is Extract<BlockNode, { kind: "block" }> =>
            c.kind === "block" && c.name === "state",
        );
        const name = args.split(/\s+/)[0] || "region";
        const path = `/ui/${name}`;
        const first = states.find((s) => s.args.trim() === "default") ?? states[0];
        if (first !== undefined) {
          const ui = (this.state["ui"] ??= {}) as Record<string, unknown>;
          ui[name] = first.args.trim();
        }
        const rest = this.blocks(
          n.children.filter((c) => !(c.kind === "block" && c.name === "state")),
        );
        const kids = states.map((s) =>
          this.add(
            "Stack",
            { direction: "vertical", label: s.args.trim() },
            { visible: { $state: path, eq: s.args.trim() }, children: this.blocks(s.children) },
          ),
        );
        return [
          this.add(
            "Stack",
            { direction: "vertical", label: name },
            { children: [...rest, ...kids] },
          ),
        ];
      }
      case "state":
        return [];
      case "if": {
        const neg = args.startsWith("!");
        const p = args.replace(/^!/, "").trim();
        const r = this.ref(p);
        const cond: Record<string, unknown> =
          r.state !== undefined ? { $state: r.state } : { $item: r.item ?? "" };
        if (neg) cond["not"] = true;
        return [this.stack(n.children, "vertical", { visible: cond })];
      }
      case "each": {
        const m = /^([A-Za-z_][\w-]*)\s+in\s+(.+)$/.exec(args);
        if (m === null) {
          this.warn(
            "degraded",
            line,
            "EACH",
            `could not read "${args}"; body exported once, unrepeated`,
          );
          return [this.stack(n.children, "vertical")];
        }
        const prev = this.item;
        this.seed(m[2]?.trim() ?? "", []);
        this.item = m[1];
        const el = this.stack(n.children, "vertical", {
          repeat: { statePath: toPointer((m[2] as string).trim()) },
        });
        this.item = prev;
        return [el];
      }
      case "panel":
      case "group": {
        const title = /^"([^"]*)"/.exec(args)?.[1] ?? args.replace(/\bopen\b/, "").trim();
        return [this.add("Group", { title }, { children: this.blocks(n.children) })];
      }
      default:
        this.warn(
          "degraded",
          line,
          n.name.toUpperCase(),
          "no component in the mdui catalog; the body is exported in a vertical Stack",
        );
        return [this.stack(n.children, "vertical")];
    }
  }
}

function deepFill(into: Record<string, unknown>, from: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(from)) {
    const cur = into[k];
    if (typeof v === "object" && v !== null && typeof cur === "object" && cur !== null)
      deepFill(cur as Record<string, unknown>, v as Record<string, unknown>);
    else if (!(k in into)) into[k] = v;
  }
}

export function exportJsonRender(doc: Document, opts: JsonRenderOptions = {}): JsonRenderResult {
  const b = new Builder(opts);
  const kids = b.blocks(doc.body);
  const root = b.add("Stack", { direction: "vertical" }, { children: kids });
  const used = new Set(Object.values(b.els).map((e) => e.type));
  const usedActions = new Set(
    Object.values(b.els).flatMap((e) => Object.values(e.on ?? {}).map((a) => a.action)),
  );
  const catalog: JrCatalog = {
    name: "mdui",
    components: Object.fromEntries(Object.entries(COMPONENTS).filter(([k]) => used.has(k))),
    actions: Object.fromEntries(Object.entries(ACTIONS).filter(([k]) => usedActions.has(k))),
  };
  const spec: JrSpec = {
    root,
    elements: b.els,
    ...(Object.keys(b.state).length > 0 ? { state: b.state } : {}),
  };
  if (
    Object.keys(b.state).length > 0 &&
    JSON.stringify(b.state) !== JSON.stringify({ ui: b.state["ui"] }) &&
    Object.keys(b.state).some((k) => k !== "ui")
  )
    b.warn(
      "synthesized",
      1,
      "{{ binding }}",
      "bound paths are seeded with empty-string state; supply real data at run time",
    );
  return { spec, catalog, warnings: b.warnings.sort((x, y) => x.line - y.line) };
}
