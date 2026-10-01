/** Using a component: is it in the catalog, are its props valid, is it trusted? (T-051 consumes this.) */
import { parseArgs, type Attrs, type WidgetArgs } from "@mdui/core";
import type { Catalog, ComponentSpec, PropSpec } from "./model.js";

export interface UseIssue {
  code: "E6001" | "E6002" | "W6003";
  message: string;
}

export function levenshtein(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++)
      cur[j] = Math.min(
        (prev[j] ?? 0) + 1,
        (cur[j - 1] ?? 0) + 1,
        (prev[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    prev = cur;
  }
  return prev[b.length] ?? 0;
}

/** The catalog name closest to `name` (≤ 3 edits), for "did you mean …" fix hints. */
export function nearest(catalog: Catalog, name: string): string | undefined {
  let best: [number, string] | undefined;
  for (const n of Object.keys(catalog.components)) {
    const dist = levenshtein(name.toUpperCase(), n);
    if (dist <= 3 && (best === undefined || dist < best[0])) best = [dist, n];
  }
  return best?.[1];
}

function typeOk(spec: PropSpec, value: string): string | undefined {
  switch (spec.type) {
    case "number":
      return /^-?\d+(\.\d+)?$/.test(value) ? undefined : "a number";
    case "boolean":
      return value === "true" || value === "false" ? undefined : "true or false";
    case "enum":
      return (spec.values ?? []).includes(value)
        ? undefined
        : `one of ${(spec.values ?? []).join(", ")}`;
    case "path":
      return /^[A-Za-z_][\w-]*(?:\.[A-Za-z_][\w-]*|\[\d+\])*$/.test(value)
        ? undefined
        : "a data path";
    default:
      return undefined;
  }
}

/** Validate one use of a component against the catalog. `args` are the parsed widget arguments (or `parseArgs(raw)`). */
export function validateUse(
  catalog: Catalog,
  name: string,
  args: WidgetArgs | string,
  attrs?: Attrs,
): UseIssue[] {
  const a = typeof args === "string" ? parseArgs(args) : args;
  const key = name.toUpperCase();
  if (!Object.hasOwn(catalog.components, key)) {
    const hint = nearest(catalog, key);
    return [
      {
        code: "E6001",
        message: `Unknown component ${key}${hint !== undefined ? `; did you mean ${hint}?` : ""}.`,
      },
    ];
  }
  const spec = catalog.components[key] as ComponentSpec;
  const out: UseIssue[] = [];
  if (spec.trust === "third-party" && !catalog.allow.includes(key))
    out.push({
      code: "W6003",
      message: `${key} is a third-party component and is not listed in \`allow\`.`,
    });
  // only components that declare props are checked: built-ins are already validated by the parser (E1301)
  if (Object.keys(spec.props).length === 0) return out;
  const named = new Set<string>();
  for (const [pn, ps] of Object.entries(spec.props)) {
    let value: string | undefined;
    if (ps.positional !== undefined) value = a.positional[ps.positional];
    if (value === undefined && Object.hasOwn(a.named, pn)) value = a.named[pn];
    const av = attrs?.props[pn];
    if (value === undefined && typeof av === "string") value = av;
    if (value === undefined && av === true && ps.type === "boolean") value = "true";
    named.add(pn);
    if (value === undefined) {
      if (ps.required === true)
        out.push({
          code: "E6002",
          message: `${key}: missing required prop "${pn}"${ps.positional !== undefined ? ` (argument ${ps.positional + 1})` : ""}.`,
        });
      continue;
    }
    const want = typeOk(ps, value);
    if (want !== undefined)
      out.push({ code: "E6002", message: `${key}: prop "${pn}" must be ${want}, got "${value}".` });
  }
  for (const k of Object.keys(a.named))
    if (!named.has(k))
      out.push({
        code: "E6002",
        message: `${key}: unknown prop "${k}"; known: ${Object.keys(spec.props).join(", ")}.`,
      });
  // extra positional words are fine when the last positional prop is free text (spaces split a string into words)
  const positionals = Object.values(spec.props).filter((x) => x.positional !== undefined);
  const maxPos = Math.max(-1, ...positionals.map((x) => x.positional as number));
  const lastIsText = positionals.some((x) => x.positional === maxPos && x.type === "string");
  if (a.positional.length > maxPos + 1 && !lastIsText)
    out.push({
      code: "E6002",
      message: `${key}: takes at most ${maxPos + 1} positional argument${maxPos === 0 ? "" : "s"}, got ${a.positional.length}.`,
    });
  return out;
}
