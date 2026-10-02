import {
  analyze,
  parse,
  walkBlocks,
  type AnalyzeOptions,
  type BlockNode,
  type Diagnostic,
  type Document,
  type Severity,
} from "@mdui/core";
import { applyFixes, type FixSourceResult } from "./fix.js";
import type { Catalog } from "@mdui/catalog";
import type { LintConfig, Rule, RuleContext } from "./rule.js";
import { a11yRules } from "./rules/a11y.js";
import { semanticRules } from "./rules/semantic.js";
import { structuralRules } from "./rules/structural.js";
import { applyWaivers, collectWaivers, type Waiver } from "./waivers.js";
import { catalogRules } from "./rules/catalog.js";
import { safetyRules } from "./rules/safety.js";
import { constraintRules } from "./rules/constraints.js";
import { tokenRules } from "./rules/tokens.js";
import { loadDesignSystem, type DesignSystem } from "@mdui/tokens";
import { lastLine } from "./util.js";

export const ALL_RULES: Rule[] = [
  ...structuralRules,
  ...semanticRules,
  ...a11yRules,
  ...tokenRules,
  ...catalogRules,
  ...safetyRules,
  ...constraintRules,
];

export interface LintResult {
  doc: Document;
  /** Rule findings sorted by position, plus un-mapped syntax diagnostics (rule `syntax`). */
  diagnostics: Diagnostic[];
  /** Suppression comments that matched nothing (reported as info by the CLI). */
  unusedSuppressions: { line: number; rules: string[] }[];
  /** Constraint waivers found in the document (T-082), with how many diagnostics each suppressed. */
  waivers: Waiver[];
}

const SUPPRESS_RE = /^<!--\s*mdui-disable(?:\s+([\w,\s-]*?))?\s*-->$/;

interface Suppression {
  /** Comment line. */
  at: number;
  from: number;
  to: number;
  rules: Set<string> | "all";
  used: boolean;
}

/** `<!-- mdui-disable rule[, rule] -->` silences findings inside the *next* sibling node only. */
function suppressions(doc: Document): Suppression[] {
  const out: Suppression[] = [];
  const scan = (nodes: BlockNode[]): void => {
    nodes.forEach((n, i) => {
      if (n.kind === "comment") {
        const m = SUPPRESS_RE.exec(n.text.trim());
        const next = nodes.slice(i + 1).find((x) => x.kind !== "comment");
        if (m !== null && next !== undefined) {
          const list = (m[1] ?? "").split(/[,\s]+/).filter(Boolean);
          out.push({
            at: n.span.start.line,
            from: next.span.start.line,
            to: lastLine(next),
            rules: list.length === 0 ? "all" : new Set(list),
            used: false,
          });
        }
      }
    });
  };
  scan(doc.body);
  walkBlocks(doc.body, ({ node }) => {
    if ("children" in node && node.kind !== "list") scan(node.children as BlockNode[]);
    if (node.kind === "list") node.children.forEach((it) => scan(it.children));
  });
  return out;
}

/** Lint source text. Never throws. */
export function lint(
  source: string,
  opts: AnalyzeOptions & {
    config?: LintConfig;
    rules?: Rule[];
    catalog?: Catalog;
    constraints?: Record<string, unknown>;
  } = {},
): LintResult {
  const src = source.replace(/\r\n/g, "\n");
  const doc = parse(src);
  const analysis = analyze(doc, opts);
  let diagnostics = [...doc.diagnostics, ...analysis.diagnostics];
  if (opts.catalog !== undefined) diagnostics = withoutKnownE1302(diagnostics, doc, opts.catalog);
  const ctx: RuleContext = {
    source: src,
    doc,
    analysis,
    diagnostics,
    ...(opts.catalog !== undefined ? { catalog: opts.catalog } : {}),
    ...(opts.constraints !== undefined ? { constraints: opts.constraints } : {}),
  };
  const out: Diagnostic[] = [];
  const covered = new Set<Diagnostic>();
  const cover = (code: string, offset: number): void => {
    for (const d of diagnostics)
      if (d.code === code && d.span.start.offset === offset) covered.add(d);
  };
  for (const rule of opts.rules ?? ALL_RULES) {
    const setting = opts.config?.rules?.[rule.id] ?? rule.defaultSeverity;
    rule.check(ctx, (f) => {
      cover(f.code, f.span.start.offset);
      if (setting === "off") return;
      const d: Diagnostic = {
        code: f.code,
        severity: setting as Severity,
        message: f.message,
        span: f.span,
        rule: rule.id,
      };
      if (f.fix !== undefined) d.fix = f.fix;
      out.push(d);
    });
  }
  for (const d of diagnostics) if (!covered.has(d)) out.push({ ...d, rule: "syntax" });

  const sups = suppressions(doc);
  const kept = out.filter((d) => {
    let dropped = false;
    for (const s of sups) {
      const line = d.span.start.line;
      if (line >= s.from && line <= s.to && (s.rules === "all" || s.rules.has(d.rule ?? ""))) {
        s.used = true;
        dropped = true;
      }
    }
    return !dropped;
  });
  const wv = collectWaivers(doc);
  const waived = applyWaivers(kept, wv.waivers, wv.problems);
  kept.length = 0;
  kept.push(...waived);
  kept.sort((a, b) => a.span.start.offset - b.span.start.offset || a.code.localeCompare(b.code));
  return {
    doc,
    diagnostics: dedupe(kept),
    waivers: wv.waivers,
    unusedSuppressions: sups
      .filter((s) => !s.used)
      .map((s) => ({ line: s.at, rules: s.rules === "all" ? [] : [...s.rules] })),
  };
}

function dedupe(list: Diagnostic[]): Diagnostic[] {
  const seen = new Set<string>();
  return list.filter((d) => {
    const k = `${d.code}@${d.span.start.offset}@${d.message}@${d.rule ?? ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const measure = (r: LintResult): [number, number] => [
  r.diagnostics.filter((d) => d.severity === "error").length,
  r.diagnostics.length,
];
const better = (a: [number, number], b: [number, number]): boolean =>
  a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);

/**
 * Verified fixing. Fixes can interact through the parser (deleting a line may turn the next one into a table row or a
 * frontmatter fence), so each fix is applied alone, the result re-linted, and the fix kept only if the document strictly
 * improves (fewer errors, then fewer diagnostics). Repeats until no fix helps, so `fixSource(fixSource(x)) = fixSource(x)`.
 */
export function fixSource(source: string, opts: Parameters<typeof lint>[1] = {}): FixSourceResult {
  let text = source.replace(/\r\n/g, "\n");
  let applied = 0;
  let rejected: { code: string; line: number }[] = [];
  for (let round = 0; round < 100; round++) {
    const cur = lint(text, opts);
    const m = measure(cur);
    rejected = [];
    let progressed = false;
    for (const d of cur.diagnostics) {
      if (d.fix === undefined || d.fix.length === 0) continue;
      const candidate = applyFixes(text, [d]).text;
      if (candidate === text) continue;
      if (better(measure(lint(candidate, opts)), m)) {
        text = candidate;
        applied++;
        progressed = true;
        break;
      }
      rejected.push({ code: d.code, line: d.span.start.line });
    }
    if (!progressed) break;
  }
  return { text, applied, rejected };
}

export interface DesignSystemLint {
  designSystem: DesignSystem;
  diagnostics: Diagnostic[];
}

/** Lint a design-system file (DESIGN.md or legacy prose): load diagnostics plus the token rules. */
export function lintDesignSystem(
  source: string,
  opts: { config?: LintConfig } = {},
): DesignSystemLint {
  const ds = loadDesignSystem(source);
  const text = source.replace(/\r\n/g, "\n");
  const doc = parse(text);
  const lineStarts: number[] = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") lineStarts.push(i + 1);
  const at = (line: number) => {
    const p = { line, col: 1, offset: lineStarts[line - 1] ?? 0 };
    return { start: p, end: p };
  };
  const out: Diagnostic[] = [];
  for (const d of ds.diagnostics)
    out.push({
      code: d.code,
      severity: d.severity,
      message: d.message,
      span: at(d.line),
      rule: "design-system-load",
    });
  const ctx: RuleContext = {
    source,
    doc: { ...doc, lineStarts },
    analysis: { diagnostics: [], includes: [], actions: Object.create(null) as never },
    diagnostics: [],
    designSystem: ds,
  };
  for (const rule of tokenRules) {
    const setting = opts.config?.rules?.[rule.id] ?? rule.defaultSeverity;
    if (setting === "off") continue;
    rule.check(ctx, (f) =>
      out.push({
        code: f.code,
        severity: setting as Severity,
        message: f.message,
        span: f.span,
        rule: rule.id,
      }),
    );
  }
  out.sort((a, b) => a.span.start.line - b.span.start.line || a.code.localeCompare(b.code));
  return { designSystem: ds, diagnostics: out };
}

/** With a catalog, the parser's generic "unknown primitive" (E1302) no longer applies to components the catalog defines. */
function withoutKnownE1302(diags: Diagnostic[], doc: Document, catalog: Catalog): Diagnostic[] {
  const known = new Map<number, number>(); // line → how many catalog-known custom components sit on it
  const bump = (line: number): void => void known.set(line, (known.get(line) ?? 0) + 1);
  walkBlocks(doc.body, ({ node }) => {
    const line = node.span.start.line;
    if (node.kind === "block" && Object.hasOwn(catalog.components, node.name.toUpperCase()))
      bump(line);
    const runs =
      node.kind === "line" || node.kind === "heading" || node.kind === "item"
        ? [node.inline]
        : node.kind === "table"
          ? [...node.headerInline, ...node.rowsInline.flat()]
          : [];
    for (const run of runs)
      for (const n of run)
        if (n.kind === "component" && Object.hasOwn(catalog.components, n.name.toUpperCase()))
          bump(line);
  });
  return diags.filter((d) => {
    if (d.code !== "E1302") return true;
    const left = known.get(d.span.start.line) ?? 0;
    if (left === 0) return true;
    known.set(d.span.start.line, left - 1);
    return false;
  });
}
