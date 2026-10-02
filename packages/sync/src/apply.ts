/**
 * `sync apply` (T-074b): compute the new files, verify them by re-extraction, and only then hand them to the writer.
 * Pure: nothing is written here. `confirm` must be passed by the caller (the CLI flag, never spec text).
 */
import { diffItems } from "./classify.js";
import { assignAnchors } from "./anchors.js";
import { fingerprintHash, sameItems, snapshot, type Item } from "./fingerprint.js";
import { emptyLock, serializeLock, side, type Lock, type LockUnit } from "./lock.js";
import { analyse, type PlanInput, type PlanEntry } from "./plan.js";
import { appendUnit, patchUnit } from "./patch.js";
import { specUnits } from "./spec.js";
import { specWaivers } from "./waivers.js";

export type Resolution = "spec" | "code" | "adopt" | "ignore";

export interface ApplyOptions {
  /** Out-of-band confirmation, supplied by the user's session (CLI `--confirm`). Spec text can never provide it. */
  confirm: boolean;
  /** Per-anchor choices for conflicts and orphans. */
  resolve?: Record<string, Resolution>;
  lockPath: string;
}

export interface FileWrite {
  path: string;
  content: string;
}
export interface ApplyResult {
  ok: boolean;
  refused?: string;
  files: FileWrite[];
  applied: { anchor: string; what: string }[];
  skipped: { anchor: string; reason: string }[];
  lock?: Lock;
}

const hashOf = (s: string): string =>
  fingerprintHash([{ role: "heading", label: s.replace(/\r\n/g, "\n") }]);

export function computeApply(input: PlanInput, opts: ApplyOptions): ApplyResult {
  if (!opts.confirm)
    return {
      ok: false,
      refused: "apply needs explicit confirmation (--confirm); it is never read from spec text",
      files: [],
      applied: [],
      skipped: [],
    };
  const first = analyse(input);
  const applied: ApplyResult["applied"] = [];
  const skipped: ApplyResult["skipped"] = [];
  const src0 = input.specSource.replace(/\r\n/g, "\n");
  let spec = src0;
  const lock: Lock = first.lock ?? emptyLock(input.specPath, "2.0", hashOf(src0));
  const entries = first.plan.entries;
  const res = opts.resolve ?? {};

  const setBase = (
    anchor: string,
    kind: string,
    specItems: readonly Item[],
    code: { path: string; items: readonly Item[] } | undefined,
  ): void => {
    const u: LockUnit = {
      kind,
      spec: side(specItems),
      ...(code !== undefined ? { code: { path: code.path, ...side(code.items) } } : {}),
    };
    lock.anchors[anchor] = u;
  };

  /** Re-extract the spec and check the unit now equals `want`. */
  const verify = (text: string, anchor: string, want: readonly Item[]): boolean => {
    const { units } = specUnits(text);
    const u = assignAnchors(units, lock).units.find((x) => x.anchor === anchor);
    return u !== undefined && sameItems(u.items, want);
  };

  for (const e of entries) {
    const choice = res[e.anchor];
    const code = e.code;
    const fromCode = (reason: string): void => {
      if (code === undefined || e.spec === undefined) return;
      const ops = diffItems(e.spec.items, code.items);
      // the lock must already know the target so the unit is still recognised after the edit
      const before = lock.anchors[e.anchor];
      lock.anchors[e.anchor] = {
        kind: e.kind,
        spec: side(code.items),
        ...(before?.code !== undefined ? { code: before.code } : {}),
      };
      const r = patchUnit(spec, e.anchor, ops, lock);
      if (r.skipped.length > 0 || !verify(r.source, e.anchor, code.items)) {
        if (before === undefined)
          delete lock.anchors[e.anchor]; // eslint-disable-line @typescript-eslint/no-dynamic-delete
        else lock.anchors[e.anchor] = before;
        skipped.push({
          anchor: e.anchor,
          reason:
            r.skipped.length > 0
              ? r.skipped.join("; ")
              : "re-extraction did not match the intended result",
        });
        return;
      }
      spec = r.source;
      setBase(e.anchor, e.kind, code.items, { path: code.path, items: code.items });
      applied.push({ anchor: e.anchor, what: reason });
    };
    switch (e.class) {
      case "clean":
        break;
      case "converged":
        if (e.spec !== undefined && code !== undefined) {
          setBase(e.anchor, e.kind, e.spec.items, { path: code.path, items: code.items });
          applied.push({ anchor: e.anchor, what: "lock updated (spec and code agree)" });
        }
        break;
      case "code-ahead":
        fromCode("spec updated from code");
        break;
      case "conflict":
        if (choice === "code") fromCode("conflict resolved toward code: spec updated");
        else if (choice === "spec")
          skipped.push({
            anchor: e.anchor,
            reason: "resolved toward spec: edit the code (see plan JSON `toCode`), then plan again",
          });
        else
          skipped.push({
            anchor: e.anchor,
            reason: "conflict: choose --resolve " + e.anchor + "=spec|code",
          });
        break;
      case "orphan-code":
        if (choice === "adopt" && code !== undefined) {
          const next = appendUnit(spec, e.anchor, code.items);
          if (verify(next, e.anchor, code.items)) {
            spec = next;
            setBase(e.anchor, "card", code.items, { path: code.path, items: code.items });
            applied.push({ anchor: e.anchor, what: "unit added to the spec" });
          } else skipped.push({ anchor: e.anchor, reason: "adopting the unit did not verify" });
        } else
          skipped.push({
            anchor: e.anchor,
            reason:
              choice === "ignore"
                ? "ignored"
                : "code-only unit: choose --resolve " + e.anchor + "=adopt|ignore",
          });
        break;
      case "spec-ahead":
      case "orphan-spec":
        skipped.push({
          anchor: e.anchor,
          reason:
            e.action === "remove-code"
              ? "the spec removed this unit: remove it from the code"
              : "spec is ahead: edit the code (see plan JSON `toCode`), then plan again",
        });
        break;
    }
  }
  for (const g of first.plan.gone) delete lock.anchors[g]; // eslint-disable-line @typescript-eslint/no-dynamic-delete

  // the lock describes the final spec text
  lock.spec = { path: input.specPath, hash: hashOf(spec) };
  lock.dsl = lock.dsl || "2.0";
  // waivers are part of the agreed state: recorded with their reason, line and anchor
  lock.waivers = specWaivers(spec, lock).sort((a, b) => a.line - b.line);
  const files: FileWrite[] = [];
  if (spec !== src0) files.push({ path: input.specPath, content: spec });
  files.push({ path: opts.lockPath, content: serializeLock(lock) });
  return { ok: true, files, applied, skipped, lock };
}

export type { PlanEntry };
export { snapshot };
