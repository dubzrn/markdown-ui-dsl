/**
 * Null-prototype dictionary. User text is used as object keys all over the toolchain (attribute names, frontmatter keys,
 * action names, binding paths, rule ids). On a plain `{}` a key like `toString`, `constructor` or `__proto__` would hit
 * `Object.prototype`; on a dictionary it is just a key.
 */
export function dict<T = never>(init?: Record<string, T>): Record<string, T> {
  const d: Record<string, T> = Object.create(null) as Record<string, T>;
  if (init !== undefined) for (const [k, v] of Object.entries(init)) d[k] = v;
  return d;
}
