import { posix } from "node:path";
import type { Io } from "./io.js";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "reference",
  ".agents",
  ".claude",
  "graphify-out",
  ".tools",
]);

export function globToRegExp(pattern: string): RegExp {
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i] as string;
    if (c === "*" && pattern[i + 1] === "*") {
      if (pattern[i + 2] === "/") {
        re += "(?:.*/)?";
        i += 2;
      } else {
        re += ".*";
        i += 1;
      }
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

const isGlob = (p: string): boolean => /[*?]/.test(p);

function walk(io: Io, absDir: string, rel: string, out: string[]): void {
  for (const e of io.readDir(absDir) ?? []) {
    if (e.isDir) {
      if (!SKIP_DIRS.has(e.name))
        walk(io, posix.join(absDir, e.name), posix.join(rel, e.name), out);
    } else out.push(posix.join(rel, e.name));
  }
}

/**
 * Expand CLI arguments into root-relative file paths (sorted, de-duplicated).
 * A directory means every `*.ui.md` below it; a glob matches against relative paths; anything else is a file.
 * Returns the files plus the arguments that matched nothing.
 */
export function expand(io: Io, args: string[]): { files: string[]; missing: string[] } {
  const files = new Set<string>();
  const missing: string[] = [];
  for (const arg of args) {
    const norm = arg.replace(/\\/g, "/");
    if (isGlob(norm)) {
      const all: string[] = [];
      walk(io, io.cwd, "", all);
      const re = globToRegExp(norm.replace(/^\.\//, ""));
      const hits = all.filter((f) => re.test(f));
      if (hits.length === 0) missing.push(arg);
      for (const h of hits) files.add(h);
      continue;
    }
    const abs = posix.resolve(io.cwd, norm);
    const entries = io.readDir(abs);
    if (entries !== undefined) {
      const all: string[] = [];
      walk(io, abs, posix.relative(io.cwd, abs), all);
      const hits = all.filter((f) => f.endsWith(".ui.md"));
      if (hits.length === 0) missing.push(arg);
      for (const h of hits) files.add(h);
    } else if (io.readFile(abs) !== undefined) files.add(posix.relative(io.cwd, abs));
    else missing.push(arg);
  }
  return { files: [...files].sort(), missing };
}
