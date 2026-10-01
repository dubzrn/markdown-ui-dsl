/** Waivers (NOV-04, T-082): `> waive: <constraint> reason="…"` suppresses that constraint in the enclosing region, on the record. */
import { walkBlocks, type Diagnostic, type Document, type Span } from "@mdui/core";
import { CONSTRAINT_NAMES } from "./rules/constraints.js";
import { lastLine } from "./util.js";

export interface Waiver {
  rule: string;
  reason: string;
  /** Line of the `> waive:` hint. */
  line: number;
  /** Lines covered: the enclosing region, or the whole document. */
  from: number;
  to: number;
  /** How many diagnostics it suppressed (0 means it is no longer needed). */
  suppressed: number;
  span: Span;
}

const WAIVE_RE = /^waive:\s*([a-z][\w-]*)(?:\s+reason="([^"]*)")?\s*$/;

export function collectWaivers(doc: Document): { waivers: Waiver[]; problems: Diagnostic[] } {
  const waivers: Waiver[] = [];
  const problems: Diagnostic[] = [];
  walkBlocks(doc.body, ({ node, parents }) => {
    if (node.kind !== "hint") return;
    const m = WAIVE_RE.exec(node.text);
    if (m === null) return;
    const rule = m[1] as string;
    const reason = (m[2] ?? "").trim();
    const bad = (message: string): void =>
      void problems.push({
        code: "E5333",
        severity: "error",
        message,
        span: node.span,
        rule: "waiver",
      });
    if (!(CONSTRAINT_NAMES as readonly string[]).includes(rule))
      return bad(`Cannot waive unknown constraint "${rule}".`);
    if (reason === "") return bad(`Waiver for "${rule}" needs reason="…" (waivers are audited).`);
    const scope = parents[parents.length - 1];
    waivers.push({
      rule,
      reason,
      line: node.span.start.line,
      from: scope === undefined ? 1 : scope.span.start.line,
      to: scope === undefined ? Number.MAX_SAFE_INTEGER : lastLine(scope),
      suppressed: 0,
      span: node.span,
    });
  });
  return { waivers, problems };
}

/** Drop waived diagnostics (counting them on the waiver) and report waivers that suppressed nothing. */
export function applyWaivers(
  list: Diagnostic[],
  waivers: Waiver[],
  problems: Diagnostic[],
): Diagnostic[] {
  const kept = list.filter((d) => {
    let dropped = false;
    for (const w of waivers)
      if (
        d.rule === `constraint-${w.rule}` &&
        d.span.start.line >= w.from &&
        d.span.start.line <= w.to
      ) {
        w.suppressed++;
        dropped = true;
      }
    return !dropped;
  });
  for (const w of waivers)
    if (w.suppressed === 0)
      kept.push({
        code: "I5334",
        severity: "info",
        message: `Waiver for "${w.rule}" suppressed nothing; remove it.`,
        span: w.span,
        rule: "waiver",
      });
  return [...kept, ...problems];
}
