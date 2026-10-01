import type { AnalyzeResult, Diagnostic, Document, Severity, Span } from "@mdui/core";

export interface RuleContext {
  doc: Document;
  /** Semantic analysis result (empty for 1.x documents). */
  analysis: AnalyzeResult;
  /** Every diagnostic the parser and analyser produced. */
  diagnostics: Diagnostic[];
}

export interface Finding {
  code: string;
  message: string;
  span: Span;
}

export interface Rule {
  /** Stable kebab-case id, used in config and output. */
  id: string;
  description: string;
  defaultSeverity: Severity;
  check(ctx: RuleContext, report: (f: Finding) => void): void;
}

export type RuleSetting = "off" | "info" | "warn" | "error";
export interface LintConfig {
  rules?: Record<string, RuleSetting>;
}
