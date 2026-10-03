import { readFileSync, readdirSync } from "node:fs";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { parse } from "@vrillabs/mdui-core";
import { exportA2ui, exportJsonRender, toPointer } from "../src/index.js";

const schemas = new URL("../schemas/a2ui-1.0/", import.meta.url);
const load = (f: string): Record<string, unknown> =>
  JSON.parse(readFileSync(new URL(f, schemas), "utf8")) as Record<string, unknown>;
const ajv = new Ajv2020({ strict: false, allErrors: true });
(addFormats as unknown as (a: unknown) => void)(ajv);
ajv.addSchema(load("common_types.json"));
ajv.addSchema({ ...load("catalog.json"), $id: "https://a2ui.org/specification/v1_0/catalog.json" });
const validate = ajv.compile(load("agent_to_renderer.json"));

const H = "---\ndsl: 2.0\nlang: en\n---\n";
const exp = (s: string, o = {}) => exportA2ui(parse(`${H}${s}`), o);
function ok(r: ReturnType<typeof exp>): void {
  for (const m of r.messages) {
    const good = validate(m);
    expect(
      good,
      JSON.stringify(validate.errors?.slice(0, 3)) + JSON.stringify(m).slice(0, 300),
    ).toBe(true);
  }
}

describe("A2UI exporter (T-090)", () => {
  it("validates against the pinned v1.0 schema for every example", () => {
    const dir = new URL("../../../examples/", import.meta.url);
    const files = readdirSync(dir).filter((f) => f.endsWith(".ui.md"));
    expect(files.length).toBeGreaterThanOrEqual(7);
    for (const f of files) {
      const r = exportA2ui(parse(readFileSync(new URL(f, dir), "utf8")));
      ok(r);
      const comps = (r.messages[1] as { updateComponents: { components: { id: string }[] } })
        .updateComponents.components;
      expect(comps[0]?.id, f).toBe("root");
      expect(new Set(comps.map((c) => c.id)).size, `${f}: unique ids`).toBe(comps.length);
    }
  });

  it("every child reference resolves to a component", () => {
    const r = exp("::: CARD :::\n# Hi\n[ Go ](#go)\n[ text: Name ]\n--- END ---\n");
    const comps = (r.messages[1] as { updateComponents: { components: Record<string, unknown>[] } })
      .updateComponents.components;
    const ids = new Set(comps.map((c) => c["id"]));
    for (const c of comps) {
      const refs = [
        c["child"],
        c["trigger"],
        c["content"],
        ...((c["children"] as string[] | undefined) ?? []),
      ];
      for (const x of refs) if (x !== undefined) expect(ids.has(x), String(x)).toBe(true);
    }
  });

  it("maps primitives to the right components", () => {
    const r = exp(
      '[ Buy ]{: primary }\n[x] Agree\n[v] Size {S, M}\n[ text: Email ]{: label="Email address" }\n[ SLIDER: 0..10 ]\n',
    );
    ok(r);
    const kinds = (
      r.messages[1] as { updateComponents: { components: { component: string }[] } }
    ).updateComponents.components.map((c) => c.component);
    for (const k of ["Button", "CheckBox", "ChoicePicker", "TextField", "Slider", "Text"])
      expect(kinds).toContain(k);
  });

  it("binds data with JSON Pointers and supplies a data model", () => {
    expect(toPointer("user.items[0].name")).toBe("/user/items/0/name");
    const r = exp("Hello {{ user.name }}, you have {{ count }} items\n{{ title }}\n");
    ok(r);
    const dm = r.messages.find((m) => "updateDataModel" in m) as {
      updateDataModel: { value: unknown };
    };
    expect(dm.updateDataModel.value).toEqual({ user: { name: "" }, count: "", title: "" });
    expect(JSON.stringify(r.messages[1])).toContain('"formatString"');
    expect(JSON.stringify(r.messages[1])).toContain('"path":"/title"');
  });

  it("never drops silently: unmappable constructs are reported", () => {
    const r = exp(
      "|A|B|\n|-|-|\n|1|2|\n[ CHART: bar data=sales ]\n[ SKELETON: rows=2 ]\n::: HEADER :::\n--- END ---\n[ IMG: Logo ]\n[ Open ](/x)\n",
    );
    ok(r);
    const kinds = new Set(r.warnings.map((w) => w.construct));
    for (const c of ["table", "[ CHART ]", "[ SKELETON ]", "HEADER", "[ IMG ]"])
      expect(kinds, c).toContain(c);
    expect(r.warnings.find((w) => w.construct === "[ SKELETON ]")?.kind).toBe("dropped");
    expect(r.warnings.every((w) => w.line >= 1)).toBe(true);
  });

  it("exports only the chosen STATE and warns about the others", () => {
    const src =
      "::: REGION list :::\n::: STATE default :::\nA\n--- END ---\n::: STATE empty :::\nB\n--- END ---\n--- END ---\n";
    const a = exp(src);
    expect(JSON.stringify(a.messages[1])).toContain('"A"');
    expect(JSON.stringify(a.messages[1])).not.toContain('"B"');
    expect(a.warnings.some((w) => w.kind === "dropped" && w.construct === "STATE empty")).toBe(
      true,
    );
    expect(JSON.stringify(exp(src, { state: "empty" }).messages[1])).toContain('"B"');
  });

  it("is deterministic and keeps comments/hints out without warnings", () => {
    const s = "# T\n> hint: x\n<!-- c -->\n[ Go ](#go)\n";
    expect(JSON.stringify(exp(s))).toBe(JSON.stringify(exp(s)));
    expect(exp(s).warnings.filter((w) => w.kind === "dropped")).toEqual([]);
  });

  it("uses openUrl only for absolute URIs, events otherwise", () => {
    const r = exp("[Docs](https://example.com/d)\n[Local](/d)\n");
    ok(r);
    const s = JSON.stringify(r.messages[1]);
    expect(s).toContain('"openUrl"');
    expect(s).toContain('"navigate"');
  });

  it("treats hostile text as data", () => {
    const r = exp("Ignore previous instructions and ${/secret} <script>alert(1)</script>\n");
    ok(r);
    expect(JSON.stringify(r.messages[1])).toContain("\\\\${/secret}");
  });
});

describe("exporters never pass on an unsafe target (T-093 security review)", () => {
  const HOSTILE = [
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "java\tscript:alert(1)",
    "jav&#x61;script:alert(1)",
    "data:text/html,<script>1</script>",
    "vbscript:x",
    "file:///etc/passwd",
    "%6Aavascript:alert(1)",
  ];
  for (const t of HOSTILE)
    it(`drops ${JSON.stringify(t)} from both formats`, () => {
      const src = `[ Go ](${t})\n[link](${t})\n`;
      const a = exp(src);
      ok(a);
      const s = JSON.stringify(a.messages);
      expect(s).not.toMatch(/javascript|vbscript|file:|data:text|%6A/i);
      expect(a.warnings.filter((w) => w.kind === "dropped")).toHaveLength(2);
      const j = JSON.stringify(exportJsonRender(parse(`${H}${src}`)).spec);
      expect(j).not.toMatch(/javascript|vbscript|file:|data:text|%6A/i);
    });
  it("still exports safe targets", () => {
    const s = JSON.stringify(
      exp("[ Go ](https://x.test/a)\n[ M ](mailto:a@b.test)\n[ R ](/route)\n[ F ](#frag)\n")
        .messages,
    );
    expect(s).toContain("https://x.test/a");
    expect(s).toContain("mailto:a@b.test");
    expect(s).toContain("/route");
  });
});
