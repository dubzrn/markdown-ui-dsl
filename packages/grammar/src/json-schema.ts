import type { Catalog } from "@vrillabs/mdui-catalog";

type Json = { [k: string]: unknown };

const FIXED = new Set(["COLUMN", "ROW", "CARD", "MODAL", "HEADER", "FOOTER", "BUBBLE"]);
const INLINE_BUILTINS = new Set([
  "BUTTON",
  "LINK",
  "INPUT",
  "IMAGE",
  "BADGE",
  "CHECKBOX",
  "RADIO",
  "TOGGLE",
  "DROPDOWN",
]);

/**
 * Specialise the AST JSON Schema to a catalog, for structured-output engines (the model emits the AST as JSON and the
 * toolchain prints it): custom components, named containers and widgets are restricted to the catalog's names.
 */
export function toJsonSchema(base: object, catalog: Catalog): Json {
  const schema = JSON.parse(JSON.stringify(base)) as Json;
  const defs = (schema["$defs"] ?? {}) as Record<string, Json>;
  const comps = Object.values(catalog.components);
  const custom = comps
    .filter((c) => c.kind === "widget" && !INLINE_BUILTINS.has(c.name) && c.trust !== "core")
    .map((c) => c.name);
  const widgets = comps
    .filter((c) => c.kind === "widget" && c.trust === "core" && !INLINE_BUILTINS.has(c.name))
    .map((c) => c.name.toLowerCase());
  const named = comps
    .filter((c) => c.kind === "container" && !FIXED.has(c.name))
    .map((c) => c.name.toLowerCase());
  const restrict = (def: string, prop: string, values: string[]): void => {
    const d = defs[def];
    const props = d?.["properties"] as Record<string, Json> | undefined;
    if (props === undefined || props[prop] === undefined) return;
    // an empty list means "none allowed": an unsatisfiable enum is rejected by some engines, so use `not: {}`
    props[prop] = values.length > 0 ? { enum: [...values].sort() } : { not: {} };
  };
  restrict("InlineComponent", "name", custom);
  restrict("InlineWidget", "widget", widgets);
  restrict("NamedBlock", "name", named);
  schema["description"] =
    `${String(schema["description"] ?? "")} Specialised to a component catalog.`.trim();
  return schema;
}
