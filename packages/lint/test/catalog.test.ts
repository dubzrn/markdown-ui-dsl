import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadCatalog } from "@mdui/catalog";
import { fixSource, lint } from "../src/index.js";

const shop = loadCatalog(
  readFileSync(new URL("../../../examples/catalogs/shop.catalog.yaml", import.meta.url), "utf8"),
).catalog;
const dsl = (body: string) => `---\ndsl: 2.0\nlang: en\n---\n${body}\n`;
const codes = (src: string, catalog = shop) =>
  lint(src, { catalog }).diagnostics.map((d) => `${d.code}@${d.span.start.line}`);

describe("catalog rules (T-051)", () => {
  it("is a no-op without a catalog", () => {
    expect(lint(dsl("[ PRODUCTCARD: Mug ]")).diagnostics.map((d) => d.code)).toEqual(["E1302"]);
  });
  it("a catalog-defined component supersedes the parser's E1302", () => {
    expect(codes(dsl("[ PRODUCTCARD: Mug, price=9 ]"))).toEqual([]);
  });
  it("unknown-component carries a nearest-name fix", () => {
    const src = dsl("[ PRODUCTCRAD: Mug, price=9 ]");
    const d = lint(src, { catalog: shop }).diagnostics.find((x) => x.code === "E6001");
    expect(d?.rule).toBe("unknown-component");
    expect(d?.message).toMatch(/PRODUCTCARD/i);
    expect(d?.fix?.[0]?.newText).toBe("PRODUCTCARD");
  });
  it("component-props reports a missing required prop", () => {
    expect(codes(dsl("[ PRODUCTCARD: Mug ]"))).toContain("E6002@5");
  });
  it("third-party-component warns unless allowed", () => {
    expect(codes(dsl("[ CAROUSEL: x ]"))).toContain("W6003@5");
    expect(codes(dsl("[ MAPVIEW: Paris ]")).filter((c) => c.startsWith("W6003"))).toEqual([]);
  });
  it("fixSource repairs the typo and reaches a fixpoint", () => {
    const r = fixSource(dsl("[ PRODUCTCRAD: Mug, price=9 ]"), { catalog: shop });
    expect(r.text).toContain("PRODUCTCARD");
  });
});
