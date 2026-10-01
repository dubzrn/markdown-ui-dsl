import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadCatalog } from "@mdui/catalog";
import { parse } from "@mdui/core";
import { lint } from "@mdui/lint";
import { buildGrammar, generator, recognizer, toJsonSchema } from "../src/index.js";

const shop = loadCatalog(
  readFileSync(new URL("../../../examples/catalogs/shop.catalog.yaml", import.meta.url), "utf8"),
).catalog;
const H = "---\ndsl: 2.0\n---\n";

describe("catalog-aware grammar (T-059)", () => {
  const rec = recognizer(buildGrammar({ catalog: shop }));
  it("accepts project components and rejects components outside the catalog", () => {
    expect(rec(`${H}[ PRODUCTCARD: mug price=9 ]\n`).ok).toBe(true);
    expect(rec(`${H}[ RATING: 4 max=5 ]\n`).ok).toBe(true);
    expect(rec(`${H}[ BOGUS: x ]\n`).ok).toBe(false);
    expect(rec(`${H}Name [ BOGUS: x ] tail\n`).ok).toBe(false);
    expect(rec(`${H}- [ BOGUS: x ]\n`).ok).toBe(false);
    expect(rec(`${H}::: BOGUS :::\n--- END ---\n`).ok).toBe(false);
  });
  it("enforces prop shapes from the schema", () => {
    expect(rec(`${H}[ PRODUCTCARD: mug price=9 currency=EUR ]\n`).ok).toBe(true);
    expect(rec(`${H}[ PRODUCTCARD: mug price=9 currency=JPY ]\n`).ok).toBe(false);
    expect(rec(`${H}[ PRODUCTCARD: mug ]\n`).ok).toBe(false); // price is required
    expect(rec(`${H}[ PRODUCTCARD: mug price=abc ]\n`).ok).toBe(false);
  });
  it("generated strings are clean under the reference lint with the catalog (zero errors)", () => {
    const gen = generator(buildGrammar({ catalog: shop }));
    for (let s = 1; s <= 1500; s++) {
      const doc = gen(s);
      const errors = lint(doc, { catalog: shop }).diagnostics.filter((d) => d.severity === "error");
      expect(
        errors.map((d) => `${d.code}@${d.span.start.line}`),
        `seed ${s}\n${doc}`,
      ).toEqual([]);
    }
  });
  it("a restricted catalog (`builtins:`) removes the other built-ins", () => {
    const small = loadCatalog("builtins: [COLUMN, CARD, CHART]\n").catalog;
    const r = recognizer(buildGrammar({ catalog: small }));
    expect(r(`${H}::: CARD :::\n--- END ---\n`).ok).toBe(true);
    expect(r(`${H}[ CHART: line data=sales ]\n`).ok).toBe(true);
    expect(r(`${H}=== ROW ===\n--- END ---\n`).ok).toBe(false);
    expect(r(`${H}[ STAT: x ]\n`).ok).toBe(false);
    expect(r(`${H}::: GRID :::\n--- END ---\n`).ok).toBe(false);
  });
});

describe("token and data enumeration (T-059b)", () => {
  const rec = recognizer(
    buildGrammar({ tokens: ["padding", "gap"], dataPaths: ["user.name", "items"] }),
  );
  it("only the supplied token names appear in directives", () => {
    expect(rec(`${H}> @md padding: compact\n`).ok).toBe(true);
    expect(rec(`${H}> @md padding: compact, gap: wide\n`).ok).toBe(true);
    expect(rec(`${H}> @md color: red\n`).ok).toBe(false);
    expect(rec(`${H}> @sm padding: compact, color: red\n`).ok).toBe(false);
    expect(rec(`${H}> align right\n`).ok).toBe(true); // a plain layout hint is not a directive
  });
  it("only the supplied data paths appear in bindings", () => {
    expect(rec(`${H}{{ user.name }}\n`).ok).toBe(true);
    expect(rec(`${H}{{ nope }}\n`).ok).toBe(false);
    expect(rec(`${H}::: EACH row in items :::\n{{ user.name }}\n--- END EACH ---\n`).ok).toBe(true);
    expect(rec(`${H}::: EACH row in other :::\n--- END EACH ---\n`).ok).toBe(false);
    expect(rec(`${H}Hello {{ nope }}\n`).ok).toBe(false);
  });
  it("generated strings use only the supplied names and parse cleanly", () => {
    const gen = generator(
      buildGrammar({ tokens: ["padding", "gap"], dataPaths: ["user.name", "items"] }),
    );
    for (let s = 1; s <= 1500; s++) {
      const doc = gen(s);
      expect(
        parse(doc).diagnostics.filter((d) => d.severity === "error"),
        `seed ${s}\n${doc}`,
      ).toEqual([]);
      for (const m of doc.matchAll(/^> (?:@\w[\w-]* )*@(?:sm|md|lg|xl) ([\w, :-]+)$/gm))
        for (const pair of (m[1] as string).split(", "))
          expect(["padding", "gap"]).toContain(pair.split(":")[0]);
      for (const m of doc.matchAll(/\{\{ ([^}]*) \}\}/g))
        expect(["user.name", "items"]).toContain((m[1] as string).trim());
    }
  });
});

describe("typed closers by construction (T-059c)", () => {
  it("no generated document contains a mismatched typed closer", () => {
    const gen = generator(buildGrammar({ catalog: shop }));
    for (let s = 1; s <= 1500; s++) {
      const doc = gen(s);
      expect(
        parse(doc).diagnostics.filter((d) => d.code === "E1004"),
        `seed ${s}`,
      ).toEqual([]);
    }
  });
});

describe("JSON Schema emitter (T-060)", () => {
  const base = {
    description: "AST",
    $defs: {
      InlineComponent: { properties: { name: { type: "string" } } },
      InlineWidget: { properties: { widget: { enum: ["slider", "chart"] } } },
      NamedBlock: { properties: { name: { type: "string" } } },
    },
  };
  it("restricts components, widgets and named blocks to the catalog", () => {
    const s = toJsonSchema(base, shop) as {
      $defs: Record<string, { properties: Record<string, unknown> }>;
    };
    expect(s.$defs["InlineComponent"]?.properties["name"]).toEqual({
      enum: ["CAROUSEL", "MAPVIEW", "PRODUCTCARD", "RATING"].filter((n) => n !== "CAROUSEL"),
    });
    expect((s.$defs["NamedBlock"]?.properties["name"] as { enum: string[] }).enum).toContain(
      "carousel",
    );
    expect(base.$defs.InlineComponent.properties.name).toEqual({ type: "string" }); // input untouched
  });
  it("an empty set becomes unsatisfiable rather than an empty enum", () => {
    const none = loadCatalog("builtins: [COLUMN]\n").catalog;
    const s = toJsonSchema(base, none) as {
      $defs: Record<string, { properties: Record<string, unknown> }>;
    };
    expect(s.$defs["InlineComponent"]?.properties["name"]).toEqual({ not: {} });
  });
});
