/**
 * Atomic, journaled writes confined to the project root (T-074b). Every target's previous content is kept in a journal
 * file before anything changes; if any write fails the previous contents are restored. A journal found at the start of
 * a run means an earlier run was interrupted: it is rolled back first.
 */
import { posix } from "node:path";
import type { FileWrite } from "./apply.js";

export interface Fs {
  /**
   * Canonical path with symlinks resolved, or undefined if the path does not exist. When provided, writes are refused if
   * the target (or its nearest existing parent) resolves outside the root: a symlinked directory inside the project must
   * not let `apply` write elsewhere.
   */
  realpath?(path: string): string | undefined;
  read(path: string): string | undefined;
  write(path: string, text: string): void;
  remove(path: string): void;
}

export const JOURNAL = ".mdui-sync.journal";

/** Resolve `p` against `root`; undefined if it escapes the root. */
export function confine(root: string, p: string): string | undefined {
  const abs = posix.resolve(root, p);
  const rel = posix.relative(root, abs);
  return rel === "" || rel.startsWith("..") || posix.isAbsolute(rel) ? undefined : abs;
}

/** True when `abs` (or, if it does not exist yet, its nearest existing parent) really lies inside the real root. */
export function realInside(fs: Fs, root: string, abs: string): boolean {
  if (fs.realpath === undefined) return true;
  const rr = fs.realpath(root);
  if (rr === undefined) return false;
  for (let cur = abs; ;) {
    const r = fs.realpath(cur);
    if (r !== undefined) {
      const rel = posix.relative(rr, r);
      return rel === "" || (!rel.startsWith("..") && !posix.isAbsolute(rel));
    }
    const up = posix.dirname(cur);
    if (up === cur) return false;
    cur = up;
  }
}

interface Journal {
  entries: { path: string; before: string | null }[];
}

/**
 * Roll back an interrupted run, if a journal exists. Every file is attempted even if one restore fails; the journal is
 * kept when anything could not be restored so a later run can try again.
 */
export function recover(fs: Fs, root: string): { restored: string[]; failed: string[] } {
  const jp = posix.join(root, JOURNAL);
  const text = fs.read(jp);
  if (text === undefined) return { restored: [], failed: [] };
  let j: Journal;
  try {
    j = JSON.parse(text) as Journal;
  } catch {
    return { restored: [], failed: [JOURNAL] };
  }
  const restored: string[] = [];
  const failed: string[] = [];
  for (const e of j.entries ?? []) {
    const abs = confine(root, e.path);
    if (abs === undefined) continue; // never trust a journal to write outside the root
    try {
      if (e.before === null) fs.remove(abs);
      else fs.write(abs, e.before);
      restored.push(e.path);
    } catch {
      failed.push(e.path);
    }
  }
  if (failed.length === 0) fs.remove(jp);
  return { restored, failed };
}

export interface WriteResult {
  ok: boolean;
  written: string[];
  error?: string;
}

export function writeAtomically(fs: Fs, root: string, files: FileWrite[]): WriteResult {
  const targets: { abs: string; rel: string; content: string }[] = [];
  for (const f of files) {
    const abs = confine(root, f.path);
    if (abs === undefined)
      return {
        ok: false,
        written: [],
        error: `refusing to write outside the project root: ${f.path}`,
      };
    if (!realInside(fs, root, abs))
      return {
        ok: false,
        written: [],
        error: `refusing to write through a symlink that leaves the project root: ${f.path}`,
      };
    targets.push({ abs, rel: posix.relative(root, abs), content: f.content });
  }
  const jp = posix.join(root, JOURNAL);
  const journal: Journal = {
    entries: targets.map((t) => ({ path: t.rel, before: fs.read(t.abs) ?? null })),
  };
  fs.write(jp, JSON.stringify(journal));
  const written: string[] = [];
  try {
    for (const t of targets) {
      fs.write(t.abs, t.content);
      written.push(t.rel);
    }
  } catch (e) {
    const rolled = recover(fs, root);
    const why = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      written: [],
      error:
        rolled.failed.length === 0
          ? `write failed, previous contents restored: ${why}`
          : `write failed and ROLLBACK IS INCOMPLETE (${rolled.failed.join(", ")}); the journal ${JOURNAL} was kept: run \`mdui sync recover\`: ${why}`,
    };
  }
  fs.remove(jp);
  return { ok: true, written };
}
