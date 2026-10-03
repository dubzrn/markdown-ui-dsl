import { ALLOWED_URL_SCHEMES, schemeOf } from "@vrillabs/mdui-core";

const MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape text for HTML content and double-quoted attribute values. */
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => MAP[c] as string);

/**
 * Only http(s), mailto, tel, fragments and relative references survive; anything else (javascript:, data:, …) becomes `#`.
 * The scheme is read the way a browser would (control characters, entities and %-escapes removed first), so `java\tscript:` is caught.
 */
export function safeUrl(u: string): string {
  const t = u.trim();
  if (t === "") return "#";
  if (u.length > 0 && u.charCodeAt(0) <= 0x20) return "#"; // leading control/space tricks (" javascript:")
  const scheme = schemeOf(t);
  if (scheme === undefined) return t;
  return ALLOWED_URL_SCHEMES.includes(scheme) ? t : "#";
}
