import type { Diagnostic } from "@mdui/core";

export interface FixResult {
  text: string;
  applied: number;
  /** Fixes skipped because they overlapped one already applied. */
  skipped: { code: string; line: number }[];
}

/**
 * Apply every diagnostic's `fix` edits to `source` in one pass. Edits are applied back to front; an edit that overlaps an
 * already accepted one is skipped (reported in `skipped`). Zero-width inserts at the same offset do not overlap.
 * Idempotent: fixing the output again changes nothing, because a fixed diagnostic no longer exists.
 */
export function applyFixes(source: string, diagnostics: Diagnostic[]): FixResult {
  type E = { start: number; end: number; text: string; code: string; line: number; order: number };
  const edits: E[][] = [];
  let order = 0;
  for (const d of diagnostics) {
    if (d.fix === undefined || d.fix.length === 0) continue;
    edits.push(
      d.fix.map((f) => ({
        start: f.span.start.offset,
        end: f.span.end.offset,
        text: f.newText,
        code: d.code,
        line: d.span.start.line,
        order: order++,
      })),
    );
  }
  const accepted: E[] = [];
  const skipped: { code: string; line: number }[] = [];
  const overlaps = (a: E, b: E): boolean => a.start < b.end && b.start < a.end;
  for (const group of edits) {
    const first = group[0] as E;
    if (group.some((e) => accepted.some((a) => overlaps(a, e))))
      skipped.push({ code: first.code, line: first.line });
    else accepted.push(...group);
  }
  accepted.sort((a, b) => b.start - a.start || b.order - a.order);
  let text = source;
  for (const e of accepted) text = text.slice(0, e.start) + e.text + text.slice(e.end);
  return { text, applied: edits.length - skipped.length, skipped };
}

export interface FixSourceResult {
  text: string;
  /** Number of fixes accepted. */
  applied: number;
  /** Diagnostics whose fix was rejected because applying it would not strictly improve the document. */
  rejected: { code: string; line: number }[];
}
