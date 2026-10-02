/** POSIX path helpers without Node APIs (ADR-003). */

export function dirname(p: string): string {
  const i = p.lastIndexOf("/");
  return i === -1 ? "" : p.slice(0, i);
}

/**
 * Resolve `rel` against directory `base` inside a sandbox root (`""` = root).
 * Returns the normalised root-relative path, or `undefined` when the result would leave the root or `rel` is absolute.
 */
export function resolveInRoot(base: string, rel: string): string | undefined {
  if (
    rel.startsWith("/") ||
    /^[A-Za-z]:[\\/]/.test(rel) ||
    rel.includes("\\") ||
    rel.includes("\0")
  )
    return undefined;
  const out: string[] = base === "" ? [] : base.split("/").filter((s) => s !== "" && s !== ".");
  for (const seg of rel.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") {
      if (out.length === 0) return undefined;
      out.pop();
    } else out.push(seg);
  }
  return out.join("/");
}
