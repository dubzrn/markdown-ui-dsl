/** Link-target policy shared by the linter, the renderer and the exporters (one definition of "what a browser would see"). */

/** Schemes a spec may link to. Everything else (javascript:, data:, file:, vbscript:, …) is unsafe. */
export const ALLOWED_URL_SCHEMES: readonly string[] = ["http", "https", "mailto", "tel"];

const decodeCodePoint = (cp: number): string =>
  Number.isInteger(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : " ";

/** What a browser would see: control characters, whitespace and zero-width characters dropped; entities and %-escapes decoded. Never throws. */
export function normaliseTarget(raw: string): string {
  let s = raw
    .replace(/&#x([0-9a-f]+);?/gi, (_, h: string) => decodeCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d: string) => decodeCodePoint(parseInt(d, 10)))
    .replace(/&(colon|tab|newline);/gi, (_, n: string) =>
      n.toLowerCase() === "colon" ? ":" : " ",
    );
  try {
    s = decodeURIComponent(s);
  } catch {
    /* keep as is */
  }
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0) as number;
    const invisible =
      c <= 0x20 ||
      (c >= 0x7f && c <= 0x9f) ||
      (c >= 0x200b && c <= 0x200f) ||
      c === 0x2028 ||
      c === 0x2029 ||
      c === 0xfeff;
    if (!invisible) out += ch;
  }
  return out;
}

/** The scheme of a target, or undefined for relative references, `#fragments` and routes. */
export function schemeOf(target: string): string | undefined {
  const m = /^([a-z][a-z0-9+.-]*):/i.exec(normaliseTarget(target));
  return m === null ? undefined : (m[1] as string).toLowerCase();
}
