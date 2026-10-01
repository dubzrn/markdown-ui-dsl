import type { AnalyzeResult, Diagnostic, Document, Severity, Span, TextEdit } from "@mdui/core";
import type { DesignSystem } from "@mdui/tokens";

export interface RuleContext {
  /** The source text that was linted (LF-normalised offsets match `doc` spans). */
  source: string;
  doc: Document;
  /** Semantic analysis result (empty for 1.x documents). */
  analysis: AnalyzeResult;
  /** Every diagnostic the parser and analyser produced. */
  diagnostics: Diagnostic[];
  /** Present when linting a design-system file (`lintDesignSystem`); token rules are no-ops without it. */
  designSystem?: DesignSystem;
}

export interface Finding {
  code: string;
  message: string;
  span: Span;
  fix?: TextEdit[];
}

export type RuleCategory = "structure" | "semantics" | "flow" | "accessibility" | "tokens";

export interface Rule {
  /** Stable kebab-case id, used in config, suppression comments and output. */
  id: string;
  category: RuleCategory;
  description: string;
  defaultSeverity: Severity;
  /** Diagnostic codes this rule can report (documented and de-duplicated by the engine). */
  codes: string[];
  /** WCAG 2.2 success criteria the rule maps to; empty ⇒ best practice (not a WCAG criterion). */
  wcag?: string[];
  fixable?: boolean;
  check(ctx: RuleContext, report: (f: Finding) => void): void;
}

export type RuleSetting = "off" | "info" | "warn" | "error";
export interface LintConfig {
  rules?: Record<string, RuleSetting>;
}
