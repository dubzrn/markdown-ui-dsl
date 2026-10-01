import {
  analyze,
  parse,
  type AnalyzeOptions,
  type Diagnostic,
  type Document,
  type Severity,
} from "@mdui/core";
import type { LintConfig, Rule, RuleContext } from "./rule.js";
import { structuralRules } from "./rules/structural.js";

export const ALL_RULES: Rule[] = [...structuralRules];

export interface LintResult {
  doc: Document;
  /** Rule findings sorted by position, plus un-mapped syntax diagnostics (rule `syntax`). */
  diagnostics: Diagnostic[];
}

const sevOf = (s: "info" | "warn" | "error"): Severity => s;

/** Lint source text. Never throws. */
export function lint(
  source: string,
  opts: AnalyzeOptions & { config?: LintConfig; rules?: Rule[] } = {},
): LintResult {
  const doc = parse(source);
  const analysis = analyze(doc, opts);
  const diagnostics = [...doc.diagnostics, ...analysis.diagnostics];
  const ctx: RuleContext = { doc, analysis, diagnostics };
  const out: Diagnostic[] = [];
  const covered = new Set<Diagnostic>();
  for (const rule of opts.rules ?? ALL_RULES) {
    const setting = opts.config?.rules?.[rule.id] ?? rule.defaultSeverity;
    if (setting === "off") {
      // still mark the rule's own diagnostics as covered so they are not re-reported as `syntax`
      rule.check(ctx, (f) => {
        for (const d of diagnostics)
          if (d.code === f.code && d.span.start.offset === f.span.start.offset) covered.add(d);
      });
      continue;
    }
    rule.check(ctx, (f) => {
      out.push({
        code: f.code,
        severity: sevOf(setting),
        message: f.message,
        span: f.span,
        rule: rule.id,
      });
      for (const d of diagnostics)
        if (d.code === f.code && d.span.start.offset === f.span.start.offset) covered.add(d);
    });
  }
  for (const d of diagnostics) if (!covered.has(d)) out.push({ ...d, rule: "syntax" });
  out.sort((a, b) => a.span.start.offset - b.span.start.offset || a.code.localeCompare(b.code));
  return { doc, diagnostics: dedupe(out) };
}

function dedupe(list: Diagnostic[]): Diagnostic[] {
  const seen = new Set<string>();
  return list.filter((d) => {
    const k = `${d.code}@${d.span.start.offset}@${d.message}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
