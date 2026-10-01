/** Component map (T-052): `mdui.map.yaml` — which code component implements each primitive / catalog item. */
import { dict } from "@mdui/core";
import { parseDocument } from "yaml";
import type { Catalog } from "./model.js";

export interface MapEntry {
  /** Component name in the target framework, e.g. `Button`. */
  component: string;
  /** Import path / package. */
  import?: string;
  /** DSL prop → framework prop, e.g. `{ label: "children", action: "onClick" }`. */
  props: Record<string, string>;
}
export interface ComponentMap {
  framework?: string;
  components: Record<string, MapEntry>;
}
export interface MapIssue {
  code: "E6101" | "I6102" | "E6103";
  message: string;
  path: string;
}

export function loadMap(source: string): { map: ComponentMap; issues: MapIssue[] } {
  const map: ComponentMap = { components: dict<MapEntry>() };
  const issues: MapIssue[] = [];
  const bad = (message: string, path: string): void =>
    void issues.push({ code: "E6103", message, path });
  const doc = parseDocument(source, { schema: "core", uniqueKeys: true });
  if (doc.errors.length > 0) {
    for (const e of doc.errors) bad(`YAML: ${e.message.split("\n")[0]}`, "");
    return { map, issues };
  }
  let raw: unknown;
  try {
    raw = doc.toJS({ maxAliasCount: 50 });
  } catch (e) {
    bad(`YAML: ${e instanceof Error ? e.message : String(e)}`, "");
    return { map, issues };
  }
  if (raw === null || raw === undefined) return { map, issues };
  if (typeof raw !== "object" || Array.isArray(raw)) {
    bad("map must be a YAML mapping", "");
    return { map, issues };
  }
  const r = raw as Record<string, unknown>;
  for (const k of Object.keys(r))
    if (!["framework", "components"].includes(k)) bad(`unknown key "${k}"`, k);
  if (typeof r["framework"] === "string") map.framework = r["framework"];
  const comps = r["components"];
  if (comps === undefined || comps === null) return { map, issues };
  if (typeof comps !== "object" || Array.isArray(comps)) {
    bad("components must be a mapping", "components");
    return { map, issues };
  }
  for (const [key, v] of Object.entries(comps as Record<string, unknown>)) {
    const path = `components.${key}`;
    if (
      v === null ||
      typeof v !== "object" ||
      Array.isArray(v) ||
      typeof (v as Record<string, unknown>)["component"] !== "string"
    ) {
      bad("entry needs a `component:` name", path);
      continue;
    }
    const o = v as Record<string, unknown>;
    const entry: MapEntry = { component: o["component"] as string, props: dict<string>() };
    if (typeof o["import"] === "string") entry.import = o["import"];
    if (o["props"] !== undefined && o["props"] !== null) {
      if (typeof o["props"] !== "object" || Array.isArray(o["props"]))
        bad("props must be a mapping", `${path}.props`);
      else
        for (const [pk, pv] of Object.entries(o["props"] as Record<string, unknown>))
          if (typeof pv === "string") entry.props[pk] = pv;
          else bad("prop mapping must be text", `${path}.props.${pk}`);
    }
    map.components[key.toUpperCase()] = entry;
  }
  return { map, issues };
}

/** E6101 for entries naming nothing in the catalog (and unknown prop names); optionally I6102 for catalog items with no mapping. */
export function checkMap(
  map: ComponentMap,
  catalog: Catalog,
  opts: { strict?: boolean } = {},
): MapIssue[] {
  const out: MapIssue[] = [];
  for (const [name, e] of Object.entries(map.components)) {
    if (!Object.hasOwn(catalog.components, name)) {
      out.push({
        code: "E6101",
        message: `Map entry ${name} is not in the catalog.`,
        path: `components.${name}`,
      });
      continue;
    }
    const spec = catalog.components[name];
    for (const pk of Object.keys(e.props))
      if (
        spec !== undefined &&
        Object.keys(spec.props).length > 0 &&
        !Object.hasOwn(spec.props, pk)
      )
        out.push({
          code: "E6101",
          message: `Map entry ${name} maps unknown prop "${pk}".`,
          path: `components.${name}.props.${pk}`,
        });
  }
  if (opts.strict === true)
    for (const [name, spec] of Object.entries(catalog.components))
      if (spec.trust !== "core" && !Object.hasOwn(map.components, name))
        out.push({
          code: "I6102",
          message: `${name} has no component-map entry.`,
          path: `components.${name}`,
        });
  return out;
}

export function resolveComponent(map: ComponentMap, name: string): MapEntry | undefined {
  const k = name.toUpperCase();
  return Object.hasOwn(map.components, k) ? map.components[k] : undefined;
}
