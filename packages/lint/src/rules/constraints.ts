/**
 * UX constraint contracts (NOV-04, T-079). A constraint is declared in frontmatter `constraints:`, project config, or a
 * region hint `> constraint: key=value`; the rule for it is silent until a constraint is declared (a contract, not a style
 * guide). Thresholds are configurable defaults, not universal usability truth. Violations are `warn` except the
 * accessibility ones.
 */
import {
  extractFlow,
  splitMenu,
  walkBlocks,
  walkInline,
  type BlockNode,
  type Document,
  type InlineNode,
  type ListItemNode,
  type Span,
  type YamlValue,
} from "@vrillabs/mdui-core";
import type { Finding, Rule, RuleContext } from "../rule.js";

export interface Value {
  on?: boolean;
  max?: number;
  min?: number;
  list?: string[];
  strict?: boolean;
}

export const CONSTRAINT_NAMES = [
  "max-primary-actions",
  "form-fields",
  "flow-depth",
  "back-path-exists",
  "destructive-needs-confirm",
  "no-dead-ends",
  "states-required",
  "error-recovery-message",
  "unique-primary-per-modal",
  "max-nav-items",
  "help-reachable",
  "every-input-labelled",
  "heading-order",
  "tap-target",
] as const;
export type ConstraintName = (typeof CONSTRAINT_NAMES)[number];

/** Parse a frontmatter / config value. Returns undefined for "not declared" (including `false`). */
export function parseValue(v: unknown): Value | undefined | "invalid" {
  if (v === undefined || v === null || v === false) return undefined;
  if (v === true) return { on: true };
  if (typeof v === "number") return Number.isFinite(v) ? { max: v, min: v } : "invalid";
  if (typeof v === "string") {
    if (v === "strict") return { on: true, strict: true };
    if (v === "true") return { on: true };
    if (v === "false") return undefined;
    if (/^-?\d+(\.\d+)?$/.test(v)) return { max: Number(v), min: Number(v) };
    const kv = /^(max|min)=(-?\d+(?:\.\d+)?)$/.exec(v);
    if (kv !== null) return { [kv[1] as "max" | "min"]: Number(kv[2]) };
    if (/^[a-z][\w-]*(\s*[,|]\s*[a-z][\w-]*)*$/.test(v)) return { list: v.split(/\s*[,|]\s*/) };
    return "invalid";
  }
  if (Array.isArray(v))
    return v.every((x) => typeof x === "string") ? { list: v as string[] } : "invalid";
  if (typeof v === "object") {
    const o = v as Record<string, YamlValue>;
    const out: Value = {};
    for (const k of Object.keys(o)) {
      if ((k === "max" || k === "min") && typeof o[k] === "number") out[k] = o[k] as number;
      else return "invalid";
    }
    return Object.keys(out).length > 0 ? out : "invalid";
  }
  return "invalid";
}

type Node = BlockNode | ListItemNode;
interface Leaf<T> {
  v: T;
  span: Span;
}
interface Region {
  node: Node | undefined;
  /** Region kind: `page` for the document body. */
  kind: string;
  span: Span;
  hints: Map<string, Value>;
  primaries: Leaf<InlineNode>[];
  fields: Leaf<InlineNode>[];
  buttons: Leaf<InlineNode>[];
  parent: Region | undefined;
  hasBinding: boolean;
}

const REGION_KINDS = new Set([
  "card",
  "modal",
  "drawer",
  "region",
  "state",
  "panel",
  "group",
  "empty",
  "toast",
  "callout",
]);
const regionKind = (n: Node): string | undefined => {
  if (n.kind === "card" || n.kind === "modal") return n.kind;
  if (n.kind === "block" && REGION_KINDS.has(n.name)) return n.name;
  return undefined;
};

interface Model {
  regions: Region[];
  page: Region;
  declared: Map<string, Value>;
  problems: { code: "E5331" | "E5332"; message: string; span: Span }[];
  headings: Leaf<number>[];
  navItems: Leaf<number>[];
  ids: Map<string, Node>;
}

const models = new WeakMap<Document, Map<string, Model>>();

function inlineRuns(n: Node): InlineNode[][] {
  switch (n.kind) {
    case "line":
    case "heading":
    case "item":
      return [n.inline];
    case "table":
      return [...n.headerInline, ...n.rowsInline.flat()];
    default:
      return [];
  }
}

function build(ctx: RuleContext): Model {
  const key = JSON.stringify(ctx.constraints ?? {});
  let byKey = models.get(ctx.doc);
  if (byKey === undefined) models.set(ctx.doc, (byKey = new Map()));
  const cached = byKey.get(key);
  if (cached !== undefined) return cached;

  const zero = { line: 1, col: 1, offset: 0 };
  const pageSpan: Span = { start: zero, end: zero };
  const page: Region = {
    node: undefined,
    kind: "page",
    span: pageSpan,
    hints: new Map(),
    primaries: [],
    fields: [],
    buttons: [],
    parent: undefined,
    hasBinding: false,
  };
  const m: Model = {
    regions: [page],
    page,
    declared: new Map(),
    problems: [],
    headings: [],
    navItems: [],
    ids: new Map(),
  };

  const fmSpan = ctx.doc.frontmatter?.span ?? pageSpan;
  const declare = (k: string, raw: unknown, span: Span, target: Map<string, Value>): void => {
    if (!(CONSTRAINT_NAMES as readonly string[]).includes(k)) {
      m.problems.push({ code: "E5331", message: `Unknown constraint "${k}".`, span });
      return;
    }
    const v = parseValue(raw);
    if (v === "invalid")
      m.problems.push({ code: "E5332", message: `Invalid value for constraint "${k}".`, span });
    else if (v !== undefined) target.set(k, v);
  };
  for (const [k, raw] of Object.entries(ctx.constraints ?? {})) declare(k, raw, fmSpan, m.declared);
  const fm = ctx.doc.meta["constraints"];
  if (fm !== undefined && fm !== null && typeof fm === "object" && !Array.isArray(fm))
    for (const [k, raw] of Object.entries(fm)) declare(k, raw, fmSpan, m.declared);

  const regionOf = new Map<Node, Region>();
  const current = (parents: Node[]): Region => {
    for (let i = parents.length - 1; i >= 0; i--) {
      const r = regionOf.get(parents[i] as Node);
      if (r !== undefined) return r;
    }
    return page;
  };
  walkBlocks(ctx.doc.body, ({ node, parents }) => {
    const kind = regionKind(node);
    if (kind !== undefined) {
      const r: Region = {
        node,
        kind,
        span: node.span,
        hints: new Map(),
        primaries: [],
        fields: [],
        buttons: [],
        parent: current(parents as Node[]),
        hasBinding: false,
      };
      regionOf.set(node, r);
      m.regions.push(r);
    }
    if ("attrs" in node && node.attrs?.id !== undefined) m.ids.set(node.attrs.id, node);
    const here = current(kind !== undefined ? [...(parents as Node[]), node] : (parents as Node[]));
    if (node.kind === "block" && (node.name === "each" || node.name === "if"))
      for (let r: Region | undefined = here; r !== undefined; r = r.parent) r.hasBinding = true;
    if (node.kind === "hint") {
      const c = /^constraint:\s*([a-z][\w-]*)\s*=\s*(.+?)\s*$/.exec(node.text);
      if (c !== null) declare(c[1] as string, c[2], node.span, here.hints);
    }
    if (node.kind === "heading") m.headings.push({ v: node.level, span: node.span });
    if (node.kind === "tabs") {
      const nav = node.tabs.length;
      m.navItems.push({ v: nav, span: node.span });
    }
    if (node.kind === "header") {
      let n = 0;
      walkBlocks([node], ({ node: inner }) => {
        for (const run of inlineRuns(inner))
          walkInline(run, (x) => void (x.kind === "link" || x.kind === "button" ? n++ : 0));
      });
      m.navItems.push({ v: n, span: node.span });
    }
    for (const run of inlineRuns(node))
      walkInline(run, (n) => {
        const leaf = { v: n, span: node.span };
        if (n.kind === "binding")
          for (let r: Region | undefined = here; r !== undefined; r = r.parent) r.hasBinding = true;
        if (n.kind === "button" || n.kind === "link") here.buttons.push(leaf);
        if (n.kind === "button" && isFlag(n, "primary")) here.primaries.push(leaf);
        if (
          ["input", "checkbox", "radio", "toggle", "dropdown"].includes(n.kind) ||
          (n.kind === "widget" && ["slider", "date", "file"].includes(n.widget))
        )
          here.fields.push(leaf);
        if (n.kind === "widget" && n.widget === "menubar")
          m.navItems.push({ v: splitMenu(n.raw).length, span: node.span });
      });
  });
  byKey.set(key, m);
  return m;
}

const isFlag = (n: InlineNode, flag: string): boolean =>
  "attrs" in n &&
  n.attrs !== undefined &&
  (n.attrs.props[flag] === true || n.attrs.classes.includes(flag));

/** The value in force for a region: nearest region hint, else the declaration. */
function effective(m: Model, r: Region, name: ConstraintName): Value | undefined {
  for (let x: Region | undefined = r; x !== undefined; x = x.parent) {
    const h = x.hints.get(name);
    if (h !== undefined) return h;
  }
  return m.declared.get(name);
}

type Check = (m: Model, ctx: RuleContext, report: (f: Finding) => void) => void;

function constraint(
  id: ConstraintName,
  code: string,
  severity: Rule["defaultSeverity"],
  description: string,
  check: Check,
  extra: Partial<Rule> = {},
): Rule {
  return {
    id: `constraint-${id}`,
    category: "constraints",
    description: `${description} (${code}). Only active once the constraint is declared.`,
    defaultSeverity: severity,
    codes: [code],
    ...extra,
    check(ctx, report) {
      const m = build(ctx);
      if (!m.declared.has(id) && !m.regions.some((r) => r.hints.has(id))) return;
      check(m, ctx, report);
    },
  };
}

const rep = (report: (f: Finding) => void, code: string, message: string, span: Span): void =>
  report({ code, message, span });

export const maxPrimaryActions = constraint(
  "max-primary-actions",
  "W5301",
  "warn",
  "A region has at most N primary actions (default 1)",
  (m, _c, report) => {
    for (const r of m.regions) {
      if (r.kind === "modal") continue; // unique-primary-per-modal covers modals
      const max = effective(m, r, "max-primary-actions")?.max ?? 1;
      if (r.primaries.length > max)
        rep(
          report,
          "W5301",
          `${r.primaries.length} primary actions in one ${r.kind}; at most ${max} allowed.`,
          r.primaries[max]?.span ?? r.span,
        );
    }
  },
);

export const formFields = constraint(
  "form-fields",
  "W5302",
  "warn",
  "A region has at most N form fields (default 7)",
  (m, _c, report) => {
    for (const r of m.regions) {
      const max = effective(m, r, "form-fields")?.max ?? 7;
      if (r.fields.length > max)
        rep(
          report,
          "W5302",
          `${r.fields.length} form fields in one ${r.kind}; at most ${max} allowed.`,
          r.fields[max]?.span ?? r.span,
        );
    }
  },
);

export const uniquePrimaryPerModal = constraint(
  "unique-primary-per-modal",
  "W5309",
  "warn",
  "Each modal has exactly one primary action",
  (m, _c, report) => {
    for (const r of m.regions)
      if (r.kind === "modal" && r.primaries.length !== 1)
        rep(
          report,
          "W5309",
          `Modal has ${r.primaries.length} primary actions; exactly one is required.`,
          r.span,
        );
  },
);

export const maxNavItems = constraint(
  "max-nav-items",
  "W5310",
  "warn",
  "Navigation (header links, tabs, menubar) has at most N items (default 7)",
  (m, _c, report) => {
    const max = m.declared.get("max-nav-items")?.max ?? 7;
    for (const n of m.navItems)
      if (n.v > max)
        rep(report, "W5310", `Navigation has ${n.v} items; at most ${max} allowed.`, n.span);
  },
);

export const helpReachable = constraint(
  "help-reachable",
  "W5311",
  "warn",
  "The screen offers a way to get help (a link or button labelled help, support, contact or FAQ)",
  (m, ctx, report) => {
    const labels = m.page.buttons.concat(...m.regions.map((r) => r.buttons));
    const ok = labels.some(
      (b) =>
        (b.v.kind === "link" || b.v.kind === "button") &&
        /\b(help|support|contact|faq)\b/i.test(b.v.label),
    );
    if (!ok && ctx.doc.meta["type"] !== "flow")
      rep(report, "W5311", "No help or support link or button on this screen.", m.page.span);
  },
);

export const statesRequired = constraint(
  "states-required",
  "W5307",
  "warn",
  "Data-bound regions define the required STATEs (default loading, empty, error)",
  (m, ctx, report) => {
    const want = m.declared.get("states-required")?.list ?? ["loading", "empty", "error"];
    walkBlocks(ctx.doc.body, ({ node }) => {
      if (node.kind !== "block" || node.name !== "region") return;
      const region = m.regions.find((r) => r.node === node);
      if (region === undefined || !region.hasBinding) return;
      const have = new Set(
        node.children.flatMap((c) =>
          c.kind === "block" && c.name === "state" ? [c.args.trim().split(/\s+/)[0] ?? ""] : [],
        ),
      );
      const missing = want.filter((s) => !have.has(s));
      if (missing.length > 0)
        rep(report, "W5307", `Data-bound region lacks state(s): ${missing.join(", ")}.`, node.span);
    });
  },
);

export const errorRecoveryMessage = constraint(
  "error-recovery-message",
  "W5308",
  "warn",
  "An `error` STATE offers a way to recover (a button or link)",
  (m, ctx, report) => {
    walkBlocks(ctx.doc.body, ({ node }) => {
      if (
        node.kind !== "block" ||
        node.name !== "state" ||
        (node.args.trim().split(/\s+/)[0] ?? "") !== "error"
      )
        return;
      const r = m.regions.find((x) => x.node === node);
      if (r !== undefined && r.buttons.length === 0)
        rep(
          report,
          "W5308",
          "Error state has no recovery action (retry, back, contact).",
          node.span,
        );
    });
  },
);

export const destructiveNeedsConfirm = constraint(
  "destructive-needs-confirm",
  "W5305",
  "warn",
  "A `destructive` action opens a MODAL (its target is a modal id) or declares `undo`",
  (m, _c, report) => {
    for (const r of m.regions.concat()) {
      for (const b of r.buttons) {
        if (b.v.kind !== "button" || !isFlag(b.v, "destructive") || isFlag(b.v, "undo")) continue;
        const target = b.v.action?.startsWith("#") ? m.ids.get(b.v.action.slice(1)) : undefined;
        const isModal =
          target !== undefined &&
          (target.kind === "modal" || (target.kind === "block" && target.name === "modal"));
        if (!isModal)
          rep(
            report,
            "W5305",
            `Destructive action "${b.v.label}" neither opens a confirmation modal nor declares undo.`,
            b.span,
          );
      }
    }
  },
);

export const everyInputLabelled = constraint(
  "every-input-labelled",
  "E5321",
  "error",
  "Every text input has a programmatic label (`label=` attribute); a placeholder is not a label",
  (m, _c, report) => {
    for (const r of m.regions)
      for (const f of r.fields) {
        const n = f.v;
        if (n.kind !== "input") continue;
        const label = "attrs" in n ? n.attrs?.props["label"] : undefined;
        if (typeof label !== "string" || label.trim() === "")
          rep(
            report,
            "E5321",
            "Input has no `label=` attribute (placeholder text disappears on typing).",
            f.span,
          );
      }
  },
);

export const headingOrder = constraint(
  "heading-order",
  "E5322",
  "error",
  "Heading levels never skip a level (strict: the first heading is level 1)",
  (m, _c, report) => {
    let prev = 0;
    for (const h of m.headings) {
      if (h.v > prev + 1)
        rep(
          report,
          "E5322",
          `Heading level ${h.v} follows level ${prev}; do not skip levels.`,
          h.span,
        );
      prev = h.v;
    }
  },
);

export const tapTarget = constraint(
  "tap-target",
  "E5323",
  "error",
  "Declared `size=` of an interactive element is at least N px; the rest is verified after code by the Oracle (T-080)",
  (m, _c, report) => {
    const min = m.declared.get("tap-target")?.min ?? 44;
    for (const r of m.regions)
      for (const b of r.buttons) {
        const n = b.v;
        const size = "attrs" in n ? n.attrs?.props["size"] : undefined;
        if (typeof size === "string" && /^\d+$/.test(size) && Number(size) < min)
          rep(report, "E5323", `Declared size ${size}px is below the ${min}px minimum.`, b.span);
      }
  },
);

// ---- flow rules (documents with `type: flow`) ----
function flowOf(ctx: RuleContext): ReturnType<typeof extractFlow> | undefined {
  return ctx.doc.meta["type"] === "flow" ? extractFlow(ctx.doc) : undefined;
}
function distances(
  flow: NonNullable<ReturnType<typeof extractFlow>>,
  from: string,
): Map<string, number> {
  const d = new Map<string, number>([[from, 0]]);
  const q = [from];
  for (let i = 0; i < q.length; i++) {
    const cur = q[i] as string;
    for (const t of flow.transitions)
      if (t.from === cur && !d.has(t.to)) {
        d.set(t.to, (d.get(cur) as number) + 1);
        q.push(t.to);
      }
  }
  return d;
}

export const flowDepth = constraint(
  "flow-depth",
  "W5303",
  "warn",
  "Every terminal (goal) screen is reachable from `start` in at most N steps (default 3)",
  (m, ctx, report) => {
    const flow = flowOf(ctx);
    if (flow === undefined || flow.start === undefined) return;
    const max = m.declared.get("flow-depth")?.max ?? 3;
    const d = distances(flow, flow.start);
    for (const s of flow.screens)
      if (s.terminal && (d.get(s.id) ?? 0) > max)
        report({
          code: "W5303",
          message: `Goal "${s.id}" is ${d.get(s.id)} steps from "${flow.start}"; at most ${max} allowed.`,
          span: lineSpan(ctx, s.line),
        });
  },
);

export const backPathExists = constraint(
  "back-path-exists",
  "W5304",
  "warn",
  "From every non-start screen the user can get back to `start`",
  (_m, ctx, report) => {
    const flow = flowOf(ctx);
    if (flow === undefined || flow.start === undefined) return;
    const start = flow.start;
    for (const s of flow.screens) {
      if (s.id === start || s.terminal) continue;
      if (!distances(flow, s.id).has(start))
        report({
          code: "W5304",
          message: `No way back to "${start}" from "${s.id}".`,
          span: lineSpan(ctx, s.line),
        });
    }
  },
);

export const noDeadEnds = constraint(
  "no-dead-ends",
  "W5306",
  "warn",
  "Every non-terminal screen has an outgoing transition",
  (_m, ctx, report) => {
    const flow = flowOf(ctx);
    if (flow === undefined) return;
    for (const s of flow.screens)
      if (!s.terminal && !flow.transitions.some((t) => t.from === s.id))
        report({
          code: "W5306",
          message: `Screen "${s.id}" is a dead end.`,
          span: lineSpan(ctx, s.line),
        });
  },
);

function lineSpan(ctx: RuleContext, line: number): Span {
  const off = ctx.doc.lineStarts[line - 1] ?? 0;
  const p = { line, col: 1, offset: off };
  return { start: p, end: p };
}

/** Problems with the constraint declarations themselves. */
export const constraintDeclarations: Rule = {
  id: "constraint-declarations",
  category: "constraints",
  description:
    "`constraints:` and `> constraint:` use known names and valid values (E5331, E5332).",
  defaultSeverity: "error",
  codes: ["E5331", "E5332"],
  check(ctx, report) {
    for (const p of build(ctx).problems) report({ code: p.code, message: p.message, span: p.span });
  },
};

export const constraintRules: Rule[] = [
  constraintDeclarations,
  maxPrimaryActions,
  formFields,
  flowDepth,
  backPathExists,
  destructiveNeedsConfirm,
  noDeadEnds,
  statesRequired,
  errorRecoveryMessage,
  uniquePrimaryPerModal,
  maxNavItems,
  helpReachable,
  everyInputLabelled,
  headingOrder,
  tapTarget,
];
