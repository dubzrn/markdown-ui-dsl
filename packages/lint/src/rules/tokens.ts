import {
  checkBreakpoints,
  checkContrast,
  checkOrphans,
  checkPrimary,
  checkRefs,
  type TokenFinding,
} from "@mdui/tokens";
import type { Finding, Rule, RuleContext } from "../rule.js";

function tokenRule(
  id: string,
  description: string,
  codes: string[],
  severity: Rule["defaultSeverity"],
  run: (ctx: RuleContext) => TokenFinding[],
  wcag?: string[],
): Rule {
  return {
    id,
    category: "tokens",
    description,
    defaultSeverity: severity,
    codes,
    ...(wcag !== undefined ? { wcag } : {}),
    check(ctx: RuleContext, report: (f: Finding) => void): void {
      if (ctx.designSystem === undefined) return;
      for (const f of run(ctx)) {
        const p = { line: f.line, col: 1, offset: ctx.doc.lineStarts[f.line - 1] ?? 0 };
        report({ code: f.code, message: f.message, span: { start: p, end: p } });
      }
    },
  };
}

const ds = (ctx: RuleContext) => ctx.designSystem as NonNullable<RuleContext["designSystem"]>;

export const brokenRef = tokenRule(
  "broken-ref",
  "Every `{token.reference}` resolves to a token, without cycles (E4001). Design-system files only.",
  ["E4001"],
  "error",
  (c) => checkRefs(ds(c)),
);
export const contrastRatio = tokenRule(
  "contrast-ratio",
  "Component text/background pairs meet WCAG AA contrast for normal text, 4.5:1 (W4002). Design-system files only.",
  ["W4002"],
  "warn",
  (c) => checkContrast(ds(c)),
  ["1.4.3"],
);
export const orphanedToken = tokenRule(
  "orphaned-token",
  "Color tokens are referenced by a component or another token (I4003). Design-system files only.",
  ["I4003"],
  "info",
  (c) => checkOrphans(ds(c)),
);
export const unknownBreakpoint = tokenRule(
  "unknown-breakpoint",
  "Declared breakpoints are sm/md/lg/xl with ascending widths (W4004). Design-system files only.",
  ["W4004"],
  "warn",
  (c) => checkBreakpoints(ds(c)),
);
export const missingPrimary = tokenRule(
  "missing-primary",
  "A DESIGN.md defines `colors.primary` (W4005). Design-system files only.",
  ["W4005"],
  "warn",
  (c) => checkPrimary(ds(c)),
);

export const tokenRules: Rule[] = [
  brokenRef,
  contrastRatio,
  orphanedToken,
  unknownBreakpoint,
  missingPrimary,
];
