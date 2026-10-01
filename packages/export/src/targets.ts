import { ALLOWED_SCHEMES, schemeOf } from "@mdui/lint";

export type TargetKind = "url" | "fragment" | "route" | "unsafe";
/**
 * Where a link or button target points. `unsafe` is any scheme outside the lint policy (http, https, mailto, tel), including
 * obfuscated spellings (entities, %-escapes, control and zero-width characters): exporters never pass those on, because the
 * host application might execute or navigate to them.
 */
export function classifyTarget(raw: string): TargetKind {
  if (raw.trim().startsWith("#")) return "fragment";
  const scheme = schemeOf(raw);
  if (scheme === undefined) return "route";
  return ALLOWED_SCHEMES.includes(scheme) ? "url" : "unsafe";
}
