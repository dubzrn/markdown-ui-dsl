/** Three-way classification per anchor (T-073): base (lock) vs spec (now) vs code (now). */
import { sameItems, type Item } from "./fingerprint.js";
import type { LockUnit } from "./lock.js";

export type SyncClass =
  "clean" | "spec-ahead" | "code-ahead" | "converged" | "conflict" | "orphan-spec" | "orphan-code";

export type Action =
  | "none"
  | "update-lock"
  | "patch-code" // agent: edit the code unit to match the spec (see plan JSON)
  | "patch-spec" // tool: edit the spec unit to match the code
  | "choose" // conflict: explicit choice or hand merge
  | "generate-code" // orphan-spec
  | "adopt-or-ignore" // orphan-code
  | "remove-code" // spec removed the unit
  | "drop"; // gone from both

export interface Classification {
  cls: SyncClass | "gone";
  action: Action;
}

/** `spec`/`code`: items now, or undefined when the unit does not exist on that side. */
export function classify(
  base: LockUnit | undefined,
  spec: readonly Item[] | undefined,
  code: readonly Item[] | undefined,
): Classification {
  if (spec !== undefined && code !== undefined) {
    if (base === undefined || base.code === undefined)
      return sameItems(spec, code)
        ? { cls: "converged", action: "update-lock" }
        : { cls: "conflict", action: "choose" };
    const sChanged = !sameItems(base.spec.items, spec);
    const cChanged = !sameItems(base.code.items, code);
    if (!sChanged && !cChanged) return { cls: "clean", action: "none" };
    if (sChanged && !cChanged) return { cls: "spec-ahead", action: "patch-code" };
    if (!sChanged && cChanged) return { cls: "code-ahead", action: "patch-spec" };
    return sameItems(spec, code)
      ? { cls: "converged", action: "update-lock" }
      : { cls: "conflict", action: "choose" };
  }
  if (spec !== undefined) return { cls: "orphan-spec", action: "generate-code" };
  if (code !== undefined) {
    if (base?.code === undefined) return { cls: "orphan-code", action: "adopt-or-ignore" };
    // the spec dropped a unit the code still has: unchanged code means the spec's removal is the news
    return sameItems(base.code.items, code)
      ? { cls: "spec-ahead", action: "remove-code" }
      : { cls: "conflict", action: "choose" };
  }
  return { cls: "gone", action: "drop" };
}

export interface ItemOp {
  op: "keep" | "add" | "remove" | "change";
  from?: Item;
  to?: Item;
}

const k = (i: Item): string =>
  JSON.stringify([i.role, i.label.replace(/\s+/g, " ").trim(), i.href ?? null, i.level ?? null]);

/** Ordered edit script turning `a` into `b` (LCS on item keys; an adjacent remove+add of one role is a `change`). */
export function diffItems(a: readonly Item[], b: readonly Item[]): ItemOp[] {
  const n = a.length;
  const m = b.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      (lcs[i] as number[])[j] =
        k(a[i] as Item) === k(b[j] as Item)
          ? ((lcs[i + 1] as number[])[j + 1] as number) + 1
          : Math.max((lcs[i + 1] as number[])[j] as number, (lcs[i] as number[])[j + 1] as number);
  const raw: ItemOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (k(a[i] as Item) === k(b[j] as Item))
      raw.push({ op: "keep", from: a[i++] as Item, to: b[j++] as Item });
    else if (((lcs[i + 1] as number[])[j] as number) >= ((lcs[i] as number[])[j + 1] as number))
      raw.push({ op: "remove", from: a[i++] as Item });
    else raw.push({ op: "add", to: b[j++] as Item });
  }
  while (i < n) raw.push({ op: "remove", from: a[i++] as Item });
  while (j < m) raw.push({ op: "add", to: b[j++] as Item });
  // pair neighbouring remove/add of the same role into a change
  const out: ItemOp[] = [];
  for (let x = 0; x < raw.length; x++) {
    const cur = raw[x] as ItemOp;
    const nxt = raw[x + 1];
    if (cur.op === "remove" && nxt?.op === "add" && cur.from?.role === nxt.to?.role) {
      out.push({ op: "change", from: cur.from as Item, to: nxt.to as Item });
      x++;
    } else if (cur.op === "add" && nxt?.op === "remove" && cur.to?.role === nxt.from?.role) {
      out.push({ op: "change", from: nxt.from as Item, to: cur.to as Item });
      x++;
    } else out.push(cur);
  }
  return out;
}
