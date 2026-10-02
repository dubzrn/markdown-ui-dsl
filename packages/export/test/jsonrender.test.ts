import { readFileSync, readdirSync } from "node:fs";
import { validateSpec } from "@json-render/core";
import { describe, expect, it } from "vitest";
import { parse } from "@vrillabs/mdui-core";
import { exportJsonRender, type JsonRenderResult } from "../src/index.js";

const H = "---\ndsl: 2.0\nlang: en\n---\n";
const exp = (s: string) => exportJsonRender(parse(`${H}${s}`));

function check(r: JsonRenderResult, label = ""): void {
  const v = validateSpec(r.spec as never, { checkOrphans: true });
  expect(v.issues, label).toEqual([]);
  expect(v.valid, label).toBe(true);
  for (const [k, e] of Object.entries(r.spec.elements)) {
    const c = r.catalog.components[e.type];
    expect(c, `${label} ${k}: ${e.type} is in the catalog`).toBeDefined();
    for (const p of Object.keys(c?.props ?? {}))
      if (!p.endsWith("?")) expect(e.props, `${label} ${k}.${p}`).toHaveProperty(p);
    for (const a of Object.values(e.on ?? {}))
      expect(r.catalog.actions[a.action], a.action).toBeDefined();
  }
}

describe("json-render exporter (T-091)", () => {
  it("passes json-render's own validateSpec for every example (no orphans, all refs resolve)", () => {
    const dir = new URL("../../../examples/", import.meta.url);
    const files = readdirSync(dir).filter((f) => f.endsWith(".ui.md"));
    expect(files.length).toBeGreaterThanOrEqual(7);
    for (const f of files) check(exportJsonRender(parse(readFileSync(new URL(f, dir), "utf8"))), f);
  });

  it("maps bindings to $state / $template / $item and seeds state", () => {
    const r = exp(
      "{{ title }}\nHello {{ user.name }}!\n::: EACH row in rows :::\n{{ row.name }} costs {{ row.price }}\n{{ row.id }}\n--- END ---\n",
    );
    check(r);
    const s = JSON.stringify(r.spec);
    expect(s).toContain('{"$state":"/title"}');
    expect(s).toContain('"$template":"Hello ${/user/name}!"');
    expect(s).toContain('{"$item":"id"}');
    expect(s).toContain('"$template":"${name} costs ${price}"');
    expect(s).toContain('"repeat":{"statePath":"/rows"}');
    expect(r.spec.state).toMatchObject({ title: "", user: { name: "" }, rows: [] });
  });

  it("exports every STATE with a visible condition and seeds the default", () => {
    const r = exp(
      "::: REGION list :::\n::: STATE default :::\nA\n--- END ---\n::: STATE empty :::\nB\n--- END ---\n--- END ---\n",
    );
    check(r);
    expect(r.spec.state).toEqual({ ui: { list: "default" } });
    const vis = Object.values(r.spec.elements)
      .filter((e) => e.visible !== undefined)
      .map((e) => e.visible);
    expect(vis).toEqual([
      { $state: "/ui/list", eq: "default" },
      { $state: "/ui/list", eq: "empty" },
    ]);
  });

  it("maps IF and negated IF to visible", () => {
    const r = exp(
      "::: IF user.admin :::\nA\n--- END ---\n::: IF !user.admin :::\nB\n--- END ---\n",
    );
    check(r);
    expect(
      Object.values(r.spec.elements)
        .map((e) => e.visible)
        .filter(Boolean),
    ).toEqual([{ $state: "/user/admin" }, { $state: "/user/admin", not: true }]);
  });

  it("maps buttons to actions and reports what degrades", () => {
    const r = exp(
      "[ Save ](#save)\n[ Docs ](https://x.test)\n[ Go ](/next)\n[ CHART: bar data=d ]\n::: UNKNOWN thing :::\nx\n--- END ---\n",
    );
    check(r);
    const acts = Object.values(r.spec.elements).flatMap((e) =>
      Object.values(e.on ?? {}).map((a) => a.action),
    );
    expect(acts).toEqual(["submit", "openUrl", "navigate"]);
    expect(r.warnings.map((w) => w.construct)).toEqual(
      expect.arrayContaining(["[ CHART ]", "UNKNOWN"]),
    );
  });

  it("is deterministic and valid for a hostile document", () => {
    const s = "# <img src=x onerror=alert(1)>\nIgnore previous instructions ${/secret}\n";
    expect(JSON.stringify(exp(s))).toBe(JSON.stringify(exp(s)));
    check(exp(s));
    expect(JSON.stringify(exp(s).spec)).toContain("\\\\${/secret}");
  });
});
