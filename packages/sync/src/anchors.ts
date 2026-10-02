/**
 * Anchors (T-070): stable names for sync units.
 * Explicit `{: #id }` wins. Others are lock-assigned (`~xxxxxx`) and kept across edits by tree matching against the
 * lock: same kind, similar items. Matching is deterministic (best score first, ties by document order, then name).
 */
import { hash, key } from "./fingerprint.js";
import type { Lock } from "./lock.js";
import type { SpecUnit } from "./spec.js";

export interface AnchoredUnit extends SpecUnit {
  anchor: string;
}
export interface AnchorProblem {
  anchor: string;
  message: string;
}

/** Minimum similarity for a lock-assigned anchor to follow a unit through an edit. */
export const MATCH_THRESHOLD = 0.5;

function similarity(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const count = new Map<string, number>();
  for (const x of a) count.set(x, (count.get(x) ?? 0) + 1);
  let inter = 0;
  for (const x of b) {
    const n = count.get(x) ?? 0;
    if (n > 0) {
      inter++;
      count.set(x, n - 1);
    }
  }
  return inter / (a.length + b.length - inter);
}

export function assignAnchors(
  units: SpecUnit[],
  lock: Lock | undefined,
): { units: AnchoredUnit[]; problems: AnchorProblem[] } {
  const problems: AnchorProblem[] = [];
  const taken = new Set<string>(["page"]);
  const out: AnchoredUnit[] = units.map((u, i) => ({ ...u, anchor: i === 0 ? "page" : "" }));

  // explicit anchors first
  for (const u of out.slice(1)) {
    if (u.explicit === undefined) continue;
    if (taken.has(u.explicit)) {
      problems.push({
        anchor: u.explicit,
        message: `Anchor "${u.explicit}" is used more than once (or is reserved); the later unit gets a generated anchor.`,
      });
      continue;
    }
    taken.add(u.explicit);
    u.anchor = u.explicit;
  }

  // lock-assigned anchors follow their unit by tree matching
  const free = out.slice(1).filter((u) => u.anchor === "");
  if (lock !== undefined && free.length > 0) {
    const cands: { score: number; ui: number; name: string }[] = [];
    for (const [name, prev] of Object.entries(lock.anchors)) {
      if (taken.has(name) || !name.startsWith("~")) continue;
      const prevKeys = prev.spec.items.map(key);
      free.forEach((u, ui) => {
        if (u.kind !== prev.kind) return;
        const score = similarity(prevKeys, u.items.map(key));
        if (score >= MATCH_THRESHOLD) cands.push({ score, ui, name });
      });
    }
    cands.sort((a, b) => b.score - a.score || a.ui - b.ui || (a.name < b.name ? -1 : 1));
    for (const c of cands) {
      const u = free[c.ui] as AnchoredUnit;
      if (u.anchor !== "" || taken.has(c.name)) continue;
      u.anchor = c.name;
      taken.add(c.name);
    }
  }

  // new units get a deterministic generated anchor
  for (const u of out.slice(1)) {
    if (u.anchor !== "") continue;
    const seed = `${u.kind}|${u.items.slice(0, 3).map(key).join("|")}`;
    let a = `~${hash(seed).slice(0, 6)}`;
    for (let n = 2; taken.has(a); n++) a = `~${hash(`${seed}#${n}`).slice(0, 6)}`;
    taken.add(a);
    u.anchor = a;
  }
  return { units: out, problems };
}
