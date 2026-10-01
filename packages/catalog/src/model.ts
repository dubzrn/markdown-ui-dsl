/** Component catalog (T-050): which components exist, their props and how far they are trusted. */
import { WIDGET_KINDS, dict } from "@mdui/core";

export type Trust = "core" | "project" | "third-party";
export type PropType = "string" | "number" | "boolean" | "enum" | "path";
export type ComponentKind = "widget" | "container";

export interface PropSpec {
  type: PropType;
  required?: boolean;
  /** Allowed values for `enum`. */
  values?: string[];
  /** Position among the positional arguments (0-based); props without one are `key=value` arguments or `{: }` attributes. */
  positional?: number;
  description?: string;
}
export interface ComponentSpec {
  /** Upper-case invocation name for widgets (`[ NAME: … ]`) / block name for containers (`::: NAME :::`). */
  name: string;
  kind: ComponentKind;
  trust: Trust;
  description?: string;
  props: Record<string, PropSpec>;
}
export interface Catalog {
  version: 1;
  /** True when the project restricted the built-ins with `builtins:`; used by the catalog-specialised grammar. */
  closed: boolean;
  /** Third-party components the project explicitly allows (W6003 otherwise). */
  allow: string[];
  components: Record<string, ComponentSpec>;
}

export const CATALOG_DIAGNOSTICS = {
  E6001: "Unknown component.",
  E6002: "Component prop violates the catalog schema.",
  W6003: "Third-party component used without an explicit allow.",
  E6101: "Component map entry names something that is not in the catalog.",
  I6102: "Catalog component has no entry in the component map.",
  E6103: "Invalid catalog or map file.",
} as const;

const p = (type: PropType, extra: Partial<PropSpec> = {}): PropSpec => ({ type, ...extra });

/** Built-in widget props (positional/named exactly as the 2.0 grammar defines them). */
const WIDGETS: Record<(typeof WIDGET_KINDS)[number], Record<string, PropSpec>> = {
  SLIDER: {
    range: p("string", { required: true, positional: 0 }),
    step: p("number"),
    value: p("number"),
  },
  DATE: { value: p("string", { positional: 0 }) },
  FILE: { label: p("string", { required: true, positional: 0 }) },
  PROGRESS: { percent: p("string", { required: true, positional: 0 }) },
  CHART: {
    type: p("enum", { required: true, positional: 0, values: ["line", "bar", "pie", "scatter"] }),
    title: p("string", { positional: 1 }),
    data: p("string", { required: true }),
  },
  STAT: {
    label: p("string", { required: true, positional: 0 }),
    value: p("string", { required: true, positional: 1 }),
    delta: p("string", { positional: 2 }),
  },
  SKELETON: { rows: p("number") },
  AVATAR: { name: p("string", { required: true, positional: 0 }) },
  ICON: { name: p("string", { required: true, positional: 0 }) },
  CRUMBS: { items: p("string", { required: true, positional: 0 }) },
  PAGER: { page: p("string", { required: true, positional: 0 }) },
  STEPPER: { steps: p("string", { required: true, positional: 0 }) },
  MENUBAR: { menus: p("string", { required: true, positional: 0 }) },
};

const CONTAINERS: [string, string][] = [
  ["COLUMN", "Vertical stack"],
  ["ROW", "Horizontal row"],
  ["CARD", "Elevated surface"],
  ["MODAL", "Dialog"],
  ["HEADER", "App bar / banner"],
  ["FOOTER", "Footer / contentinfo"],
  ["BUBBLE", "Chat bubble (USER|AGENT)"],
  ["GRID", "Grid; cols=N"],
  ["ACCORDION", "Accordion of PANELs"],
  ["PANEL", "Accordion panel"],
  ["DRAWER", "Side drawer; side=left|right"],
  ["TOAST", "Transient message"],
  ["TOOLTIP", "Tooltip; for=#id"],
  ["CALLOUT", "Callout box"],
  ["EMPTY", "Empty state"],
  ["TREE", "Tree from nested list"],
  ["GROUP", "Titled group box"],
  ["REGION", "Named region with states"],
  ["STATE", "A state of a region"],
  ["EACH", "Repeat over a list"],
  ["IF", "Conditional"],
];

const INLINE_BUILTINS: [string, string][] = [
  ["BUTTON", "Button `[ Label ](#action)`"],
  ["LINK", "Link `[Label](url)`"],
  ["INPUT", "Text input `[ text: placeholder ]`"],
  ["IMAGE", "Image placeholder `[ IMG: description ]`"],
  ["BADGE", "Badge `(( Tag ))`"],
  ["CHECKBOX", "Checkbox `[x] Label`"],
  ["RADIO", "Radio `(x) Label`"],
  ["TOGGLE", "Toggle `[on] Label`"],
  ["DROPDOWN", "Dropdown `[v] Label {a, b}`"],
];

/** The default catalog: every built-in primitive, trust `core`. */
export function defaultCatalog(): Catalog {
  const components = dict<ComponentSpec>();
  for (const k of WIDGET_KINDS)
    components[k] = { name: k, kind: "widget", trust: "core", props: dict(WIDGETS[k]) };
  for (const [n, d] of CONTAINERS)
    components[n] = {
      name: n,
      kind: "container",
      trust: "core",
      description: d,
      props: dict<PropSpec>(),
    };
  for (const [n, d] of INLINE_BUILTINS)
    components[n] = {
      name: n,
      kind: "widget",
      trust: "core",
      description: d,
      props: dict<PropSpec>(),
    };
  return { version: 1, closed: false, allow: [], components };
}

/** Names of every built-in the default catalog covers (used by the coverage test and the grammar emitters). */
export const BUILTIN_NAMES = (): string[] => Object.keys(defaultCatalog().components);
