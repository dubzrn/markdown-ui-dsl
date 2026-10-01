const MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape text for HTML content and double-quoted attribute values. */
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => MAP[c] as string);

/** Only http(s), mailto, tel, fragments and relative references survive; anything else (javascript:, data:, …) becomes `#`. */
export function safeUrl(u: string): string {
  const t = u.trim();
  if (t === "") return "#";
  if (u.length > 0 && u.charCodeAt(0) <= 0x20) return "#"; // leading control/space tricks (" javascript:")
  const scheme = /^([A-Za-z][A-Za-z0-9+.-]*):/.exec(t);
  if (scheme === null) return t;
  return ["http", "https", "mailto", "tel"].includes((scheme[1] as string).toLowerCase()) ? t : "#";
}
