import { readFileSync } from "node:fs";
import { BLOCK_KINDS, WIDGET_KINDS } from "@mdui/core";
import { describe, expect, it } from "vitest";
import {
  BUILTIN_NAMES,
  checkMap,
  defaultCatalog,
  levenshtein,
  loadCatalog,
  loadMap,
  nearest,
  resolveComponent,
  validateUse,
} from "../src/index.js";

const shop = new URL("../../../examples/catalogs/", import.meta.url);
const read = (f: string): string => readFileSync(new URL(f, shop), "utf8");

describe("default catalog (T-050)", () => {
  const c = defaultCatalog();
  it("covers every built-in widget and container the parser knows", () => {
    for (const k of WIDGET_KINDS) expect(Object.hasOwn(c.components, k), k).toBe(true);
    for (const k of BLOCK_KINDS) expect(Object.hasOwn(c.components, k), k).toBe(true);
    for (const k of [
      "COLUMN",
      "ROW",
      "CARD",
      "MODAL",
      "HEADER",
      "FOOTER",
      "BUBBLE",
      "BUTTON",
      "LINK",
      "INPUT",
      "IMAGE",
      "BADGE",
      "CHECKBOX",
      "RADIO",
      "TOGGLE",
      "DROPDOWN",
    ])
      expect(Object.hasOwn(c.components, k), k).toBe(true);
    expect(BUILTIN_NAMES().length).toBe(Object.keys(c.components).length);
  });
  it("everything built in is trust `core`", () => {
    expect(Object.values(c.components).every((x) => x.trust === "core")).toBe(true);
  });
});

describe("catalog loader", () => {
  it("loads the shop catalog: custom components typed, trust exposed", () => {
    const { catalog, issues } = loadCatalog(read("shop.catalog.yaml"));
    expect(issues).toEqual([]);
    expect(catalog.components["PRODUCTCARD"]).toMatchObject({
      trust: "project",
      kind: "widget",
      props: {
        title: { type: "string", required: true, positional: 0 },
        price: { type: "number", required: true },
      },
    });
    expect(catalog.components["MAPVIEW"]?.trust).toBe("third-party");
    expect(catalog.components["CAROUSEL"]).toMatchObject({
      kind: "container",
      trust: "third-party",
    });
    expect(catalog.allow).toEqual(["MAPVIEW"]);
    expect(catalog.components["SLIDER"]?.trust).toBe("core"); // built-ins are still there
  });
  it("reports every problem and still returns a usable catalog", () => {
    const { catalog, issues } = loadCatalog(
      "version: 2\nwat: 1\ncomponents:\n  bad name:\n    trust: project\n  X:\n    trust: shady\n    props:\n      a: { type: float }\n      e: { type: enum }\n  SLIDER:\n    trust: project\n",
    );
    expect(issues.map((i) => i.path)).toEqual(
      expect.arrayContaining([
        "version",
        "wat",
        "components.bad name",
        "components.X.trust",
        "components.X.props.a.type",
        "components.X.props.e.values",
        "components.SLIDER",
      ]),
    );
    expect(catalog.components["SLIDER"]?.trust).toBe("core");
  });
  it("`builtins:` restricts the built-ins (catalog-specialised grammar)", () => {
    const { catalog, issues } = loadCatalog(
      "builtins: [BUTTON, CARD, COLUMN]\ncomponents:\n  Rating:\n    props:\n      value: { type: number, positional: 0 }\n",
    );
    expect(issues).toEqual([]);
    expect(Object.keys(catalog.components).sort()).toEqual(["BUTTON", "CARD", "COLUMN", "RATING"]);
    expect(catalog.closed).toBe(true);
    expect(loadCatalog("builtins: [NOPE]").issues[0]?.message).toMatch(/not a built-in/);
  });
  it("never throws, bounds YAML aliases, and treats prototype names as plain names", () => {
    for (const s of ["", "[1]", ": :", "components: 5", "components:\n  X: 5", "allow: 3"])
      expect(() => loadCatalog(s), s).not.toThrow();
    const bomb =
      "a: &a [x,x,x,x,x,x,x,x,x]\nb: &b [*a,*a,*a,*a,*a,*a,*a,*a,*a]\nc: &c [*b,*b,*b,*b,*b,*b,*b,*b,*b]\nd: &d [*c,*c,*c,*c,*c,*c,*c,*c,*c]\ne: [*d,*d,*d,*d,*d,*d,*d,*d,*d]\n";
    expect(loadCatalog(bomb).issues.length).toBeGreaterThan(0);
    const { catalog } = loadCatalog("components:\n  toString:\n    props: {}\n");
    expect(Object.hasOwn(catalog.components, "TOSTRING")).toBe(true);
    expect(validateUse(catalog, "constructor", "").map((i) => i.code)).toEqual(["E6001"]);
  });
});

describe("validateUse", () => {
  const { catalog } = loadCatalog(read("shop.catalog.yaml"));
  it("unknown component with a nearest-name hint", () => {
    const [i] = validateUse(catalog, "PRODUCTCRAD", "x");
    expect(i?.code).toBe("E6001");
    expect(i?.message).toContain("did you mean PRODUCTCARD");
    expect(validateUse(catalog, "ZZZZZZZZ", "")[0]?.message).not.toContain("did you mean");
  });
  it("props: required, types, enums, unknown, positional", () => {
    expect(validateUse(catalog, "PRODUCTCARD", "Shoes price=49.9 currency=EUR featured")).toEqual(
      [],
    );
    const m = (s: string) => validateUse(catalog, "PRODUCTCARD", s).map((i) => i.message);
    expect(m("price=1")).toEqual([expect.stringContaining('missing required prop "title"')]);
    expect(m("Shoes")).toEqual([expect.stringContaining('missing required prop "price"')]);
    expect(m("Shoes price=abc")).toEqual([expect.stringContaining("must be a number")]);
    expect(m("Shoes price=1 currency=JPY")).toEqual([
      expect.stringContaining("one of USD, EUR, GBP"),
    ]);
    expect(m("Shoes price=1 color=red")).toEqual([expect.stringContaining('unknown prop "color"')]);
    expect(validateUse(catalog, "RATING", "4 5")[0]?.message).toContain("at most 1 positional");
  });
  it("props can also come from the attribute list", () => {
    expect(
      validateUse(catalog, "PRODUCTCARD", "Shoes", {
        classes: [],
        props: { price: "9", featured: true } as never,
      }),
    ).toEqual([]);
  });
  it("third-party components need an explicit allow", () => {
    expect(validateUse(catalog, "MAPVIEW", "Paris")).toEqual([]); // allowed
    expect(validateUse(catalog, "CAROUSEL", "").map((i) => i.code)).toEqual(["W6003"]);
  });
  it("levenshtein and nearest", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(nearest(catalog, "slider")).toBe("SLIDER");
  });
});

describe("component map (T-052)", () => {
  const { catalog } = loadCatalog(read("shop.catalog.yaml"));
  it("resolves for the shop example", () => {
    const { map, issues } = loadMap(read("shop.map.yaml"));
    expect(issues).toEqual([]);
    expect(map.framework).toBe("react");
    expect(resolveComponent(map, "productcard")).toMatchObject({
      component: "ProductCard",
      import: "@/components/shop/product-card",
    });
    expect(resolveComponent(map, "rating")?.component).toBe("StarRating");
    expect(resolveComponent(map, "constructor")).toBeUndefined();
    expect(checkMap(map, catalog)).toEqual([]);
  });
  it("E6101 for unknown mappings; I6102 in strict mode for unmapped catalog items", () => {
    const { map } = loadMap(
      "components:\n  Nope:\n    component: X\n  Rating:\n    component: R\n    props:\n      value: v\n      weird: w\n",
    );
    const issues = checkMap(map, catalog, { strict: true });
    expect(issues.filter((i) => i.code === "E6101").map((i) => i.path)).toEqual([
      "components.NOPE",
      "components.RATING.props.weird",
    ]);
    expect(issues.filter((i) => i.code === "I6102").map((i) => i.path)).toEqual([
      "components.PRODUCTCARD",
      "components.MAPVIEW",
      "components.CAROUSEL",
    ]);
  });
  it("malformed map files are reported, not thrown", () => {
    for (const s of [
      "",
      "[1]",
      "components: 3",
      "components:\n  X: 1",
      "components:\n  X:\n    component: 5",
      "wat: 1",
    ])
      expect(() => loadMap(s), s).not.toThrow();
    expect(loadMap("wat: 1").issues[0]?.path).toBe("wat");
  });
});
