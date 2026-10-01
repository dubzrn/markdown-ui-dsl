import { posix } from "node:path";
import type { Io } from "./io.js";

/** True when the real (symlink-resolved) path of `abs` lies inside the real `root`. Without `io.realpath` there is nothing to resolve. */
export function realWithin(io: Io, root: string, abs: string): boolean {
  if (io.realpath === undefined) return true;
  const rr = io.realpath(root);
  const ra = io.realpath(abs);
  if (rr === undefined || ra === undefined) return false;
  const rel = posix.relative(rr, ra);
  return rel === "" || (!rel.startsWith("..") && !posix.isAbsolute(rel));
}

/** Read a file named by a spec (include, data file, catalog) only if it is really inside the project root, symlinks included. */
export function readConfined(io: Io, root: string, p: string): string | undefined {
  const abs = posix.resolve(root, p);
  return realWithin(io, root, abs) ? io.readFile(abs) : undefined;
}
