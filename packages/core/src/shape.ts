/** Data shapes for validating `{{ path }}` bindings against `data:` (RFC-0001 §3c). */
import type { YamlValue } from "./frontmatter.js";

export type Shape =
  | { kind: "any" }
  | { kind: "leaf" }
  | { kind: "obj"; props: Record<string, Shape> }
  | { kind: "arr"; item: Shape };

export const ANY: Shape = { kind: "any" };

/** Shape of a concrete value (inline `data:` map or parsed JSON). Arrays use their first element. */
export function shapeOfValue(v: unknown): Shape {
  if (Array.isArray(v)) return { kind: "arr", item: v.length > 0 ? shapeOfValue(v[0]) : ANY };
  if (v !== null && typeof v === "object") {
    const props: Record<string, Shape> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) props[k] = shapeOfValue(x);
    return { kind: "obj", props };
  }
  return { kind: "leaf" };
}

/** Shape of a JSON Schema (subset: type, properties, items, $ref is treated as any). */
export function shapeOfSchema(s: unknown): Shape {
  if (s === null || typeof s !== "object") return ANY;
  const o = s as Record<string, unknown>;
  if (o["properties"] !== undefined && typeof o["properties"] === "object") {
    const props: Record<string, Shape> = {};
    for (const [k, x] of Object.entries(o["properties"] as Record<string, unknown>))
      props[k] = shapeOfSchema(x);
    return { kind: "obj", props };
  }
  if (o["type"] === "array")
    return { kind: "arr", item: o["items"] === undefined ? ANY : shapeOfSchema(o["items"]) };
  if (o["type"] === "object") return ANY;
  if (typeof o["type"] === "string") return { kind: "leaf" };
  return ANY;
}

export function isJsonSchema(v: unknown): boolean {
  return (
    v !== null &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    ("properties" in v ||
      "$schema" in v ||
      ("type" in v && typeof (v as Record<string, unknown>)["type"] === "string" && "items" in v))
  );
}

const SEG = /([A-Za-z_][\w-]*)|\[(\d+)\]/g;

/** Walk `a.b[0].c` through a shape; returns the reached shape or `undefined` if the path does not exist. */
export function resolvePath(shape: Shape, path: string): Shape | undefined {
  let cur: Shape = shape;
  for (const m of path.matchAll(SEG)) {
    if (cur.kind === "any") return ANY;
    if (m[1] !== undefined) {
      if (cur.kind !== "obj") return undefined;
      const next: Shape | undefined = cur.props[m[1]];
      if (next === undefined) return undefined;
      cur = next;
    } else {
      if (cur.kind !== "arr") return undefined;
      cur = cur.item;
    }
  }
  return cur;
}

export function shapeOfFrontmatterData(v: YamlValue | undefined): Shape | undefined {
  return v === undefined ? undefined : shapeOfValue(v);
}
