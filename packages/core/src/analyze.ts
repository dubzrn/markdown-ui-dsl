/** Semantic analysis: ids, regions/states, data bindings, actions, includes, flows (T-022, T-023, T-025, T-026). */
import { dict } from "./dict.js";
import type { Attrs } from "./attrs.js";
import type { BlockNode, Document, NamedBlockNode } from "./ast.js";
import { makeDiagnostic, type Diagnostic, type DiagnosticCode, type Span } from "./diagnostics.js";
import { analyzeFlow, extractFlow, type Flow, type FlowAnalysis } from "./flow.js";
import type { YamlValue } from "./frontmatter.js";
import { PATH_RE, type InlineNode } from "./inline.js";
import { parse } from "./parse.js";
import { dirname, resolveInRoot } from "./paths.js";
import {
  ANY,
  isJsonSchema,
  resolvePath,
  shapeOfSchema,
  shapeOfValue,
  type Shape,
} from "./shape.js";
import { inlinesOf, walkBlocks, walkInline } from "./walk.js";

export interface AnalyzeOptions {
  /** Root-relative path of this document (for resolving includes and data files). Default: "" (root). */
  file?: string;
  /** Injected reader; returns the file text or `undefined`. `core` itself does no I/O (ADR-003). */
  readFile?: (path: string) => string | undefined;
}

export interface ActionDef {
  intent?: string;
  destructive: boolean;
  confirm?: boolean | string;
}
export type ActionRegistry = Record<string, ActionDef>;

export interface ResolvedInclude {
  /** Root-relative target path (undefined when it escaped the root). */
  path: string | undefined;
  line: number;
  doc?: Document;
  /** Diagnostics inside the included file (not merged into the includer's list). */
  diagnostics: Diagnostic[];
  includes: ResolvedInclude[];
}

export interface AnalyzeResult {
  diagnostics: Diagnostic[];
  includes: ResolvedInclude[];
  actions: ActionRegistry;
  flow?: Flow;
  flowAnalysis?: FlowAnalysis;
}

const MAX_INCLUDE_DEPTH = 8;
const IDENT = /^[A-Za-z_][\w-]*$/;
const STATE_NAME = /^[a-z][a-z0-9-]*$/;
const EACH_RE = /^([A-Za-z_]\w*) in (\S+)$/;
const BIND_RE = /\{\{\s*([^{}]*?)\s*\}\}/g;

interface Ctx {
  doc: Document;
  opts: AnalyzeOptions;
  stack: string[];
  out: Diagnostic[];
  ids: Map<string, number>;
  root: Shape | undefined;
  actions: ActionRegistry;
  includes: ResolvedInclude[];
}

const spanOf = (n: { span: Span }): Span => n.span;

function add(ctx: Ctx, code: DiagnosticCode, span: Span, message?: string): void {
  ctx.out.push(makeDiagnostic(code, span, message));
}

/** Span of the frontmatter line that defines `key` (falls back to the whole frontmatter). */
function keySpan(ctx: Ctx, key: string): Span {
  const fm = ctx.doc.frontmatter;
  if (fm === undefined) return lineSpanAt(ctx, 1);
  const k = fm.raw.split("\n").findIndex((l) => l.startsWith(`${key}:`));
  return k === -1 ? fm.span : lineSpanAt(ctx, fm.span.start.line + 1 + k);
}

function lineSpanAt(ctx: Ctx, line: number): Span {
  const p = { line, col: 1, offset: ctx.doc.lineStarts[line - 1] ?? 0 };
  return { start: p, end: p };
}

function noteId(ctx: Ctx, attrs: Attrs | undefined, span: Span): void {
  if (attrs?.id === undefined) return;
  if (ctx.ids.has(attrs.id))
    add(
      ctx,
      "E2001",
      span,
      `Duplicate #id "${attrs.id}" (first used on line ${ctx.ids.get(attrs.id)}).`,
    );
  else ctx.ids.set(attrs.id, span.start.line);
}

function checkBinding(ctx: Ctx, path: string, scope: Record<string, Shape>, span: Span): void {
  const head = /^[A-Za-z_][\w-]*/.exec(path)?.[0] ?? "";
  if (head === "props") {
    if (ctx.doc.meta["type"] !== "partial")
      add(ctx, "E2101", span, `\`props\` is only available inside partials (${path}).`);
    return;
  }
  if (Object.hasOwn(scope, head)) {
    if (resolvePath({ kind: "obj", props: scope }, path) === undefined)
      add(ctx, "E2101", span, `"${path}" is not in scope.`);
    return;
  }
  if (ctx.root === undefined) return; // no `data:` declared: nothing to validate against
  const merged: Shape =
    ctx.root.kind === "obj"
      ? { kind: "obj", props: dict<Shape>({ ...ctx.root.props, ...scope }) }
      : ctx.root;
  if (resolvePath(merged, path) === undefined)
    add(ctx, "E2101", span, `"${path}" is not in the declared data.`);
}

function scanString(ctx: Ctx, text: string, scope: Record<string, Shape>, span: Span): void {
  for (const m of text.matchAll(BIND_RE)) {
    const inner = m[1] ?? "";
    if (PATH_RE.test(inner)) checkBinding(ctx, inner, scope, span);
    else add(ctx, "E2102", span, `Bindings take a data path only, not "${inner}".`);
  }
}

function inlineChecks(ctx: Ctx, run: InlineNode[], scope: Record<string, Shape>, span: Span): void {
  walkInline(run, (n) => {
    switch (n.kind) {
      case "binding":
        checkBinding(ctx, n.path, scope, span);
        break;
      case "button":
        scanString(ctx, n.label, scope, span);
        if (n.action?.startsWith("#") && Object.keys(ctx.actions).length > 0) {
          const name = n.action.slice(1);
          if (!Object.hasOwn(ctx.actions, name))
            add(ctx, "E2501", span, `Action "${name}" is not in the actions registry.`);
        }
        noteId(ctx, n.attrs, span);
        break;
      case "link":
      case "badge":
      case "checkbox":
      case "radio":
      case "toggle":
      case "dropdown":
        scanString(ctx, n.label, scope, span);
        noteId(ctx, n.attrs, span);
        break;
      case "input":
        scanString(ctx, n.placeholder, scope, span);
        noteId(ctx, n.attrs, span);
        break;
      case "image":
        scanString(ctx, n.description, scope, span);
        noteId(ctx, n.attrs, span);
        break;
      case "widget":
        noteId(ctx, n.attrs, span);
        break;
      case "use":
        includeUse(ctx, n.path, span);
        break;
      default:
        break;
    }
  });
}

function loadData(ctx: Ctx): void {
  const data = ctx.doc.meta["data"];
  if (data === undefined || data === null) return;
  if (typeof data === "string") {
    const span = keySpan(ctx, "data");
    const target = resolveInRoot(dirname(ctx.opts.file ?? ""), data);
    if (target === undefined)
      return add(ctx, "E2301", span, `data path "${data}" escapes the project root.`);
    const text = ctx.opts.readFile?.(target);
    if (text === undefined) {
      if (ctx.opts.readFile !== undefined)
        add(ctx, "E2305", span, `Data file "${target}" not found.`);
      return;
    }
    try {
      const json: unknown = JSON.parse(text);
      ctx.root = isJsonSchema(json) ? shapeOfSchema(json) : shapeOfValue(json);
    } catch {
      add(ctx, "E2305", span, `Data file "${target}" is not valid JSON.`);
    }
    return;
  }
  ctx.root = isJsonSchema(data) ? shapeOfSchema(data) : shapeOfValue(data);
}

function loadActions(ctx: Ctx): void {
  const raw = ctx.doc.meta["actions"];
  if (raw === undefined || raw === null) return;
  const span = keySpan(ctx, "actions");
  if (typeof raw !== "object" || Array.isArray(raw))
    return add(ctx, "E2502", span, "`actions` must be a map of name → definition.");
  for (const [name, def] of Object.entries(raw)) {
    const d: YamlValue = def;
    if (d === null || typeof d !== "object" || Array.isArray(d)) {
      add(ctx, "E2502", span, `Action "${name}" must be a map (intent, destructive, confirm).`);
      continue;
    }
    const entry: ActionDef = { destructive: d["destructive"] === true };
    if (d["destructive"] !== undefined && typeof d["destructive"] !== "boolean")
      add(ctx, "E2502", span, `Action "${name}": destructive must be true or false.`);
    if (typeof d["intent"] === "string") entry.intent = d["intent"];
    else if (d["intent"] !== undefined)
      add(ctx, "E2502", span, `Action "${name}": intent must be text.`);
    const c = d["confirm"];
    if (typeof c === "boolean" || typeof c === "string") entry.confirm = c;
    ctx.actions[name] = entry;
  }
}

function includeUse(ctx: Ctx, rel: string, span: Span): void {
  const here = ctx.opts.file ?? "";
  const target = resolveInRoot(dirname(here), rel);
  const rec: ResolvedInclude = {
    path: target,
    line: span.start.line,
    diagnostics: [],
    includes: [],
  };
  ctx.includes.push(rec);
  if (target === undefined)
    return add(ctx, "E2301", span, `Include "${rel}" escapes the project root.`);
  if (ctx.stack.length >= MAX_INCLUDE_DEPTH)
    return add(ctx, "E2303", span, `Include depth exceeds ${MAX_INCLUDE_DEPTH}.`);
  if (target === here || ctx.stack.includes(target))
    return add(ctx, "E2302", span, `Include cycle through "${target}".`);
  const text = ctx.opts.readFile?.(target);
  if (text === undefined) {
    if (ctx.opts.readFile !== undefined) add(ctx, "E2304", span, `Include "${target}" not found.`);
    return;
  }
  const sub = parse(text);
  rec.doc = sub;
  if (sub.meta["type"] !== "partial") {
    add(ctx, "E2304", span, `Include "${target}" must declare \`type: partial\`.`);
    return;
  }
  const r = analyze(sub, { ...ctx.opts, file: target }, [...ctx.stack, here]);
  rec.diagnostics = [...sub.diagnostics, ...r.diagnostics];
  rec.includes = r.includes;
  // Surface the first error found inside the include at the `[[ USE ]]` line, so linting the includer sees it.
  const inner = rec.diagnostics.find((d) => d.severity === "error");
  if (inner !== undefined) {
    const code: DiagnosticCode =
      inner.code === "E2302" || inner.code === "E2303" ? inner.code : "E2306";
    add(ctx, code, span, `In "${target}" line ${inner.span.start.line}: ${inner.message}`);
  }
}

function visit(
  ctx: Ctx,
  nodes: BlockNode[],
  scope: Record<string, Shape>,
  parent: NamedBlockNode | undefined,
): void {
  for (const n of nodes) {
    const span = spanOf(n);
    if ("attrs" in n && n.attrs !== undefined) {
      noteId(ctx, n.attrs, span);
      for (const v of Object.values(n.attrs.props))
        if (typeof v === "string") scanString(ctx, v, scope, span);
    }
    if (n.kind === "table") {
      n.headerInline.forEach((run) => inlineChecks(ctx, run, scope, span));
      n.rowsInline.forEach((row, k) =>
        row.forEach((run) =>
          inlineChecks(ctx, run, scope, lineSpanAt(ctx, span.start.line + 2 + k)),
        ),
      );
    } else for (const run of inlinesOf(n)) inlineChecks(ctx, run, scope, span);
    if (n.kind === "list") {
      for (const item of n.children) {
        inlineChecks(ctx, item.inline, scope, spanOf(item));
        visit(ctx, item.children, scope, parent);
      }
      continue;
    }
    if (n.kind === "block") {
      let inner = scope;
      const a = n.args.trim();
      if (n.name === "region") {
        if (!IDENT.test(a)) add(ctx, "E1303", span, "REGION needs a name: `::: REGION users :::`.");
        const states = n.children.filter(
          (c): c is NamedBlockNode => c.kind === "block" && c.name === "state",
        );
        if (states.length > 0 && !states.some((s) => s.args.trim() === "default"))
          add(ctx, "W3201", span, `REGION "${a}" has states but no \`default\`.`);
        const seen = new Set<string>();
        for (const s of states) {
          const nm = s.args.trim();
          if (seen.has(nm)) add(ctx, "E1303", spanOf(s), `Duplicate state "${nm}".`);
          seen.add(nm);
        }
      } else if (n.name === "state") {
        if (parent?.name !== "region")
          add(ctx, "E1303", span, "STATE must be directly inside a REGION.");
        if (!STATE_NAME.test(a))
          add(ctx, "E1303", span, `State name "${a}" must match [a-z][a-z0-9-]*.`);
      } else if (n.name === "each") {
        const m = EACH_RE.exec(a);
        if (m === null || !PATH_RE.test(m[2] as string)) {
          add(ctx, "E1303", span, "EACH needs `item in path`.");
        } else {
          const alias = m[1] as string;
          const path = m[2] as string;
          checkBinding(ctx, path, scope, span);
          const head = /^[A-Za-z_][\w-]*/.exec(path)?.[0] ?? "";
          const base: Shape | undefined = Object.hasOwn(scope, head)
            ? resolvePath({ kind: "obj", props: scope }, path)
            : ctx.root === undefined
              ? ANY
              : resolvePath(ctx.root, path);
          const item: Shape = base?.kind === "arr" ? base.item : ANY;
          if (base !== undefined && base.kind !== "arr" && base.kind !== "any")
            add(ctx, "E1303", span, `"${path}" is not a list.`);
          inner = dict<Shape>({ ...scope, [alias]: item });
        }
      } else if (n.name === "if") {
        const m = /^(!?)(\S+)$/.exec(a);
        if (m === null || !PATH_RE.test(m[2] as string))
          add(ctx, "E1303", span, "IF needs a path: `IF user.admin` or `IF !user.admin`.");
        else checkBinding(ctx, m[2] as string, scope, span);
      }
      visit(ctx, n.children, inner, n);
      continue;
    }
    if ("children" in n) visit(ctx, n.children as BlockNode[], scope, parent);
  }
}

/** Run all semantic checks on a parsed document. Never throws. */
export function analyze(
  doc: Document,
  opts: AnalyzeOptions = {},
  stack: string[] = [],
): AnalyzeResult {
  const ctx: Ctx = {
    doc,
    opts,
    stack,
    out: [],
    ids: new Map(),
    root: undefined,
    actions: dict<ActionDef>(),
    includes: [],
  };
  const result: AnalyzeResult = {
    diagnostics: ctx.out,
    includes: ctx.includes,
    actions: ctx.actions,
  };
  if (doc.dsl !== "2.0") return result;
  loadData(ctx);
  loadActions(ctx);
  visit(ctx, doc.body, dict<Shape>(), undefined);
  if (doc.meta["type"] === "flow") {
    const flow = extractFlow(doc);
    result.flow = flow;
    flowChecks(ctx, flow);
    result.flowAnalysis = analyzeFlow(flow);
  }
  ctx.out.sort((a, b) => a.span.start.offset - b.span.start.offset);
  return result;
}

function flowChecks(ctx: Ctx, flow: Flow): void {
  const at = (line: number): Span => lineSpanAt(ctx, line);
  for (const p of flow.problems) add(ctx, "E2403", at(p.line), p.message);
  const ids = new Set<string>();
  for (const s of flow.screens) {
    if (ids.has(s.id)) add(ctx, "E2001", at(s.line), `Duplicate screen id "${s.id}".`);
    ids.add(s.id);
  }
  if (flow.start !== undefined && !ids.has(flow.start))
    add(ctx, "E2402", keySpan(ctx, "start"), `start "${flow.start}" is not a screen.`);
  for (const t of flow.transitions) {
    for (const end of [t.from, t.to])
      if (!ids.has(end)) add(ctx, "E2402", at(t.line), `Unknown screen "${end}".`);
  }
  // E2401: the action must exist on the source screen (needs the screen files)
  if (ctx.opts.readFile === undefined) return;
  const actionsOf = new Map<string, Set<string> | undefined>();
  for (const s of flow.screens) {
    const target = resolveInRoot(dirname(ctx.opts.file ?? ""), s.file);
    const text = target === undefined ? undefined : ctx.opts.readFile(target);
    if (target === undefined)
      add(ctx, "E2301", at(s.line), `Screen file "${s.file}" escapes the project root.`);
    else if (text === undefined)
      add(ctx, "E2304", at(s.line), `Screen file "${target}" not found.`);
    actionsOf.set(s.id, text === undefined ? undefined : collectActions(parse(text)));
  }
  for (const t of flow.transitions) {
    const set = actionsOf.get(t.from);
    if (set !== undefined && !set.has(t.action))
      add(ctx, "E2401", at(t.line), `Screen "${t.from}" has no action #${t.action}.`);
  }
}

/** Action names a screen exposes: button targets `#name` plus registry keys. */
export function collectActions(doc: Document): Set<string> {
  const set = new Set<string>();
  walkBlocks(doc.body, ({ node }) => {
    for (const run of inlinesOf(node))
      walkInline(run, (n) => {
        if (n.kind === "button" && n.action?.startsWith("#")) set.add(n.action.slice(1));
      });
  });
  const reg = doc.meta["actions"];
  if (reg !== null && typeof reg === "object" && !Array.isArray(reg))
    for (const k of Object.keys(reg)) set.add(k);
  return set;
}
