import { dict } from "@mdui/core";
import { parseDocument } from "yaml";
import {
  defaultCatalog,
  type Catalog,
  type ComponentSpec,
  type PropSpec,
  type PropType,
  type Trust,
} from "./model.js";

export interface CatalogIssue {
  code: "E6103";
  message: string;
  path: string;
}

const TRUSTS: Trust[] = ["core", "project", "third-party"];
const TYPES: PropType[] = ["string", "number", "boolean", "enum", "path"];
const NAME = /^[A-Za-z][A-Za-z0-9]*$/;

/** Load `mdui.catalog.yaml` on top of the default catalog. Never throws; problems come back as issues. */
export function loadCatalog(source: string): { catalog: Catalog; issues: CatalogIssue[] } {
  const catalog = defaultCatalog();
  const issues: CatalogIssue[] = [];
  const bad = (message: string, path: string): void =>
    void issues.push({ code: "E6103", message, path });
  const doc = parseDocument(source, { schema: "core", uniqueKeys: true });
  if (doc.errors.length > 0) {
    for (const e of doc.errors) bad(`YAML: ${e.message.split("\n")[0]}`, "");
    return { catalog, issues };
  }
  let raw: unknown;
  try {
    raw = doc.toJS({ maxAliasCount: 50 });
  } catch (e) {
    bad(`YAML: ${e instanceof Error ? e.message : String(e)}`, "");
    return { catalog, issues };
  }
  if (raw === null || raw === undefined) return { catalog, issues };
  if (typeof raw !== "object" || Array.isArray(raw)) {
    bad("catalog must be a YAML mapping", "");
    return { catalog, issues };
  }
  const r = raw as Record<string, unknown>;
  if (r["version"] !== undefined && r["version"] !== 1)
    bad(`unsupported catalog version ${String(r["version"])} (expected 1)`, "version");
  for (const k of Object.keys(r))
    if (!["version", "builtins", "allow", "components"].includes(k)) bad(`unknown key "${k}"`, k);
  if (r["builtins"] !== undefined) {
    // restrict the built-ins this project uses (catalog-specialised grammar): everything else core becomes unknown
    if (!Array.isArray(r["builtins"]) || r["builtins"].some((x) => typeof x !== "string"))
      bad("builtins must be a list of built-in names", "builtins");
    else {
      const keep = new Set((r["builtins"] as string[]).map((x) => x.toUpperCase()));
      for (const k of keep)
        if (!Object.hasOwn(catalog.components, k)) bad(`"${k}" is not a built-in`, "builtins");
      const kept = dict<ComponentSpec>();
      for (const [k, v] of Object.entries(catalog.components)) if (keep.has(k)) kept[k] = v;
      catalog.components = kept;
      catalog.closed = true;
    }
  }
  if (r["allow"] !== undefined) {
    if (!Array.isArray(r["allow"]) || r["allow"].some((x) => typeof x !== "string"))
      bad("allow must be a list of component names", "allow");
    else catalog.allow = (r["allow"] as string[]).map((x) => x.toUpperCase());
  }
  const comps = r["components"];
  if (comps !== undefined && comps !== null) {
    if (typeof comps !== "object" || Array.isArray(comps))
      bad("components must be a mapping", "components");
    else
      for (const [key, v] of Object.entries(comps as Record<string, unknown>)) {
        const path = `components.${key}`;
        if (!NAME.test(key)) {
          bad(`component name "${key}" must be letters and digits, starting with a letter`, path);
          continue;
        }
        if (v === null || typeof v !== "object" || Array.isArray(v)) {
          bad("component must be a mapping", path);
          continue;
        }
        const c = v as Record<string, unknown>;
        const name = key.toUpperCase();
        const trust = (c["trust"] ?? "project") as Trust;
        if (!TRUSTS.includes(trust))
          bad(`trust must be one of ${TRUSTS.join(", ")}`, `${path}.trust`);
        const kind = (c["kind"] ?? "widget") as ComponentSpec["kind"];
        if (kind !== "widget" && kind !== "container")
          bad("kind must be widget or container", `${path}.kind`);
        const spec: ComponentSpec = {
          name,
          kind: kind === "container" ? "container" : "widget",
          trust: TRUSTS.includes(trust) ? trust : "project",
          props: dict<PropSpec>(),
        };
        if (typeof c["description"] === "string") spec.description = c["description"];
        const props = c["props"];
        if (props !== undefined && props !== null) {
          if (typeof props !== "object" || Array.isArray(props))
            bad("props must be a mapping", `${path}.props`);
          else
            for (const [pn, pv] of Object.entries(props as Record<string, unknown>)) {
              const pp = `${path}.props.${pn}`;
              if (pv === null || typeof pv !== "object" || Array.isArray(pv)) {
                bad("prop must be a mapping with a type", pp);
                continue;
              }
              const o = pv as Record<string, unknown>;
              const type = o["type"] as PropType;
              if (!TYPES.includes(type)) {
                bad(`type must be one of ${TYPES.join(", ")}`, `${pp}.type`);
                continue;
              }
              const ps: PropSpec = { type };
              if (o["required"] === true) ps.required = true;
              if (
                typeof o["positional"] === "number" &&
                Number.isInteger(o["positional"]) &&
                o["positional"] >= 0
              )
                ps.positional = o["positional"];
              if (type === "enum") {
                if (!Array.isArray(o["values"]) || o["values"].length === 0)
                  bad("enum needs a non-empty values list", `${pp}.values`);
                else ps.values = (o["values"] as unknown[]).map(String);
              }
              if (typeof o["description"] === "string") ps.description = o["description"];
              spec.props[pn] = ps;
            }
        }
        if (
          Object.hasOwn(catalog.components, name) &&
          (catalog.components[name] as ComponentSpec).trust === "core"
        )
          bad(`"${name}" is a built-in; choose another name`, path);
        else catalog.components[name] = spec;
      }
  }
  return { catalog, issues };
}
