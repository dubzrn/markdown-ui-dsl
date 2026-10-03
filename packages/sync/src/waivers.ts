/** Waivers recorded in `.ui.lock` (T-072/T-082): `> waive: rule reason="…"` with its location and the anchor it sits in. */
import { walkBlocks } from "@vrillabs/mdui-core";
import { assignAnchors } from "./anchors.js";
import type { Lock, LockWaiver } from "./lock.js";
import { specUnits } from "./spec.js";

const WAIVE_RE = /^waive:\s*([a-z][\w-]*)\s+reason="([^"]+)"\s*$/;

/** Waivers found in a spec, each with the anchor of the innermost sync unit that contains it (`page` at top level). */
export function specWaivers(source: string, lock?: Lock): LockWaiver[] {
  const { doc, units } = specUnits(source);
  const anchored = assignAnchors(units, lock).units;
  const unitOf = (line: number): string => {
    let best = "page";
    let size = Infinity;
    for (const u of anchored) {
      if (u.span === undefined) continue;
      if (
        u.span.start.line <= line &&
        line <= u.span.end.line &&
        u.span.end.line - u.span.start.line < size
      ) {
        best = u.anchor;
        size = u.span.end.line - u.span.start.line;
      }
    }
    return best;
  };
  const out: LockWaiver[] = [];
  walkBlocks(doc.body, ({ node }) => {
    if (node.kind !== "hint") return;
    const m = WAIVE_RE.exec(node.text);
    if (m === null) return;
    out.push({
      rule: m[1] as string,
      reason: (m[2] as string).trim(),
      line: node.span.start.line,
      anchor: unitOf(node.span.start.line),
    });
  });
  return out;
}

export interface WaiverAudit {
  /** In the spec but not in the lock (new since the last sync). */
  unrecorded: LockWaiver[];
  /** In the lock but gone from the spec (a waiver was removed: its diagnostic is back). */
  removed: LockWaiver[];
  /** In both, with a different reason. */
  changed: { was: LockWaiver; now: LockWaiver }[];
}

const same = (a: LockWaiver, b: LockWaiver): boolean => a.rule === b.rule && a.anchor === b.anchor;

export function auditWaivers(
  spec: readonly LockWaiver[],
  lock: readonly LockWaiver[],
): WaiverAudit {
  const unrecorded = spec.filter((w) => !lock.some((l) => same(l, w)));
  const removed = lock.filter((l) => !spec.some((w) => same(l, w)));
  const changed: WaiverAudit["changed"] = [];
  for (const w of spec) {
    const was = lock.find((l) => same(l, w));
    if (was !== undefined && was.reason !== w.reason) changed.push({ was, now: w });
  }
  return { unrecorded, removed, changed };
}
