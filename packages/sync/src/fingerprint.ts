/**
 * Semantic fingerprints (T-071a): what a sync unit *means*, independent of how it is written.
 * A fingerprint is the ordered list of items a user can see or operate: role, accessible label, link target.
 * Formatting, attribute order, class names and component wrappers do not change it.
 */
export type Role =
  "button" | "link" | "textbox" | "checkbox" | "radio" | "switch" | "combobox" | "heading" | "img";

export interface Item {
  role: Role;
  label: string;
  /** Link target (links only). */
  href?: string;
  /** Heading level (headings only). */
  level?: number;
  /** 1-based source line in the artifact the item was read from (not part of equality). */
  line?: number;
}

export const norm = (s: string): string => s.replace(/\s+/g, " ").trim();

/** Equality key: role + label (+ href, level). */
export function key(i: Item): string {
  return JSON.stringify([i.role, norm(i.label), i.href ?? null, i.level ?? null]);
}

export function sameItems(a: readonly Item[], b: readonly Item[]): boolean {
  return a.length === b.length && a.every((x, i) => key(x) === key(b[i] as Item));
}

/** FNV-1a 64-bit-ish (two 32-bit lanes) hex digest: stable, dependency-free, not cryptographic. */
export function hash(s: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

export const fingerprintHash = (items: readonly Item[]): string => hash(items.map(key).join("\n"));

/** Items as stored in a lock: no line numbers, labels normalised. */
export function snapshot(items: readonly Item[]): Item[] {
  return items.map((i) => ({
    role: i.role,
    label: norm(i.label),
    ...(i.href !== undefined ? { href: i.href } : {}),
    ...(i.level !== undefined ? { level: i.level } : {}),
  }));
}
