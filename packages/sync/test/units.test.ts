import { describe, expect, it } from "vitest";
import {
  assignAnchors,
  extractHtml,
  extractTsx,
  parseLock,
  relink,
  serializeLock,
  specUnits,
  emptyLock,
  side,
  type Item,
  specWaivers,
  auditWaivers,
  computeApply,
} from "../src/index.js";

const H = "---\ndsl: 2.0\nlang: en\n---\n";
const anchorsOf = (src: string, lock?: Parameters<typeof assignAnchors>[1]) =>
  assignAnchors(specUnits(src).units, lock).units.map((u) => u.anchor);

describe("anchors (T-070)", () => {
  const card = (body: string, id = "") => `::: CARD :::${id}\n${body}\n--- END ---\n`;
  const first = `${H}${card("## Pay\n[ Pay now ](#pay)\n[ Cancel ](#c)")}${card("## Help\n[ Contact ](#h)")}`;
  const lockFor = (src: string) => {
    const lock = emptyLock("a.ui.md", "2.0", "x");
    const units = assignAnchors(specUnits(src).units, undefined).units;
    for (const u of units.slice(1)) lock.anchors[u.anchor] = { kind: u.kind, spec: side(u.items) };
    return lock;
  };

  it("explicit anchors win and are used as written", () => {
    expect(anchorsOf(`${H}${card("## A", "{: #checkout }")}`)).toEqual(["page", "checkout"]);
  });
  it("generated anchors are deterministic and unique", () => {
    const a = anchorsOf(first);
    expect(a).toEqual(anchorsOf(first));
    expect(a[1]).toMatch(/^~[0-9a-f]{6}$/);
    expect(new Set(a).size).toBe(a.length);
    const twins = anchorsOf(`${H}${card("## A")}${card("## A")}`);
    expect(new Set(twins).size).toBe(3);
  });
  it("survive a label edit, reordering and wrapper insertion", () => {
    const lock = lockFor(first);
    const base = anchorsOf(first, lock);
    const edited = first.replace("[ Pay now ](#pay)", "[ Pay today ](#pay)"); // one of three items renamed
    expect(anchorsOf(edited, lock)).toEqual(base);
    const swapped = `${H}${card("## Help\n[ Contact ](#h)")}${card("## Pay\n[ Pay now ](#pay)\n[ Cancel ](#c)")}`;
    expect(anchorsOf(swapped, lock)).toEqual([base[0], base[2], base[1]]);
    const wrapped =
      `${H}::: COLUMN :::\n`.replace("COLUMN :::", "||| COLUMN |||") +
      `${first.slice(H.length)}--- END ---\n`;
    expect(anchorsOf(wrapped, lock)).toEqual(base);
  });
  it("a unit that changed beyond the threshold gets a new anchor", () => {
    const lock = lockFor(first);
    const rewritten = first.replace(
      "## Pay\n[ Pay now ](#pay)\n[ Cancel ](#c)",
      "## Totally\n[ New ](#n)\n[ Other ](#o)",
    );
    const a = anchorsOf(rewritten, lock);
    expect(a[1]).not.toBe(anchorsOf(first, lock)[1]);
  });
  it("duplicate explicit anchors are diagnosed", () => {
    const r = assignAnchors(
      specUnits(`${H}${card("## A", "{: #x }")}${card("## B", "{: #x }")}`).units,
      undefined,
    );
    expect(r.problems).toHaveLength(1);
    expect(new Set(r.units.map((u) => u.anchor)).size).toBe(3);
  });
  it("matching is deterministic", () => {
    const lock = lockFor(first);
    for (let i = 0; i < 20; i++) expect(anchorsOf(first, lock)).toEqual(anchorsOf(first, lock));
  });
});

describe(".ui.lock (T-072)", () => {
  const lock = emptyLock("a.ui.md", "2.0", "abc");
  lock.anchors["login"] = {
    kind: "card",
    spec: side([{ role: "button", label: "Go" }]),
    code: { path: "L.tsx", ...side([{ role: "button", label: "Go" }]) },
  };
  lock.anchors["a-first"] = { kind: "card", spec: side([]) };
  it("round-trips with deterministic, sorted output", () => {
    const text = serializeLock(lock);
    const r = parseLock(text);
    expect(r.problems).toEqual([]);
    expect(serializeLock(r.lock as typeof lock)).toBe(text);
    expect(text.indexOf('"a-first"')).toBeLessThan(text.indexOf('"login"'));
    expect(text.endsWith("\n")).toBe(true);
  });
  it("refuses unknown versions and malformed files", () => {
    expect(parseLock('{"version": 2}').problems[0]).toMatch(/unsupported .ui.lock version/);
    expect(parseLock("not json").lock).toBeUndefined();
    expect(parseLock("[]").lock).toBeUndefined();
    expect(
      parseLock(
        JSON.stringify({
          version: 1,
          dsl: "2.0",
          spec: { path: "a", hash: "b" },
          anchors: {
            x: { kind: "card", spec: { hash: "h", items: [{ role: "nope", label: "x" }] } },
          },
        }),
      ).problems.join(),
    ).toMatch(/malformed/);
  });
  it("relink renames an anchor and refuses clashes", () => {
    const l = parseLock(serializeLock(lock)).lock as typeof lock;
    expect(relink(l, "login", "sign-in")).toBeUndefined();
    expect(Object.keys(l.anchors)).toContain("sign-in");
    expect(relink(l, "nope", "x")).toMatch(/no anchor/);
    expect(relink(l, "sign-in", "a-first")).toMatch(/already exists/);
    expect(relink(l, "sign-in", "bad name")).toMatch(/not a valid/);
  });
  it("lock content is review-friendly: one item per line, no line numbers", () => {
    expect(serializeLock(lock)).not.toMatch(/"line"/);
  });
});

describe("code adapters (T-071)", () => {
  const want: Item[] = [
    { role: "heading", label: "Sign in", level: 2 },
    { role: "textbox", label: "Email" },
    { role: "button", label: "Sign in" },
    { role: "link", label: "Forgot password?", href: "/reset" },
  ];
  const sig = (items: Item[]) =>
    items.map(({ role, label, href, level }) => ({
      role,
      label,
      ...(href !== undefined ? { href } : {}),
      ...(level !== undefined ? { level } : {}),
    }));
  it("HTML: reads anchored units, with labels from aria-label, <label for> and text", () => {
    const html = `<main><section data-mdui-anchor="login"><h2>Sign in</h2>
      <label for="e">Email</label><input id="e" type="text"><button type="submit" class="x">  Sign   in </button>
      <a href="/reset">Forgot password?</a></section><button>Stray</button></main>`;
    const r = extractHtml(html, "a.html");
    expect(r.units).toHaveLength(1);
    expect(sig(r.units[0]?.items ?? [])).toEqual(sig(want));
    expect(r.unmapped.map((u) => u.tag)).toEqual(["button"]);
  });
  it("HTML: stable under formatting, attribute order, class names and wrappers", () => {
    const a = `<section data-mdui-anchor="u"><button>Save</button><a href="/x">Go</a></section>`;
    const b = `<div><section class="a b" data-mdui-anchor="u">\n <div><button\n type="button" class="z">\n Save </button></div>\n <a   href="/x"  class="q">Go</a>\n</section></div>`;
    expect(sig(extractHtml(a, "a").units[0]?.items ?? [])).toEqual(
      sig(extractHtml(b, "b").units[0]?.items ?? []),
    );
  });
  it("HTML: a nested anchored element is a unit of its own", () => {
    const r = extractHtml(
      `<section data-mdui-anchor="outer"><button>A</button><div data-mdui-anchor="inner"><button>B</button></div></section>`,
      "a",
    );
    expect(r.units.map((u) => [u.anchor, u.items.map((i) => i.label)])).toEqual([
      ["outer", ["A"]],
      ["inner", ["B"]],
    ]);
  });
  it("HTML: <!-- ui:anchor name --> before an element anchors it", () => {
    expect(
      extractHtml(`<!-- ui:anchor box --><div><button>Ok</button></div>`, "a").units[0]?.anchor,
    ).toBe("box");
  });
  it("TSX: anchor comment, JSX string children, aria-label props, component names", () => {
    const tsx = `export const S = () => (<>
      {/* ui:anchor login */}
      <Card className="p">
        <h2>{"Sign in"}</h2>
        <Input aria-label="Email" />
        <Button variant="primary" onClick={() => go(1 < 2)}>Sign in</Button>
        <a href="/reset">Forgot password?</a>
        {cond && <span>{dynamic}</span>}
      </Card></>);`;
    const r = extractTsx(tsx, "L.tsx");
    expect(r.units.map((u) => u.anchor)).toEqual(["login"]);
    expect(sig(r.units[0]?.items ?? [])).toEqual(sig(want));
  });
  it("TSX: // ui:anchor line comments, data-mdui-anchor attributes and component-map roles", () => {
    const tsx = `// ui:anchor top\nconst a = <Panel><StarRating aria-label="Rating" /></Panel>;\nconst b = <section data-mdui-anchor="other"><Button>Ok</Button></section>;`;
    const r = extractTsx(tsx, "x.tsx", { components: { StarRating: "button" } });
    expect(r.units.map((u) => [u.anchor, u.items.map((i) => `${i.role}:${i.label}`)])).toEqual([
      ["top", ["button:Rating"]],
      ["other", ["button:Ok"]],
    ]);
  });
  it("never throws on hostile input", () => {
    for (const s of [
      "<",
      "<<<>>>",
      "<a",
      '<a href="',
      "{{{",
      "<Button>{`${",
      "\u0000",
      "<!--",
      "<div".repeat(500),
      "<a>".repeat(2000),
    ]) {
      expect(() => extractHtml(s, "a")).not.toThrow();
      expect(() => extractTsx(`// ui:anchor x\n${s}`, "a")).not.toThrow();
    }
  });
});

describe("waivers in the lock (T-072)", () => {
  const spec = (w: string) =>
    `---\ndsl: 2.0\nlang: en\nconstraints:\n  form-fields: 1\n---\n::: CARD :::{: #pay }\n${w}[ text: a ]{: label="a" }\n[ text: b ]{: label="b" }\n--- END ---\n`;
  const W = '> waive: form-fields reason="two fields needed"\n';
  const apply = (src: string, lockText?: string) =>
    computeApply(
      { specPath: "a.ui.md", specSource: src, lockText, code: [] },
      { confirm: true, lockPath: ".ui.lock" },
    );
  it("extracts rule, reason, line and the anchor of the enclosing unit", () => {
    expect(specWaivers(spec(W))).toEqual([
      { rule: "form-fields", reason: "two fields needed", line: 8, anchor: "pay" },
    ]);
    expect(specWaivers(`${spec("")}> waive: heading-order reason="top"\n`)[0]?.anchor).toBe("page");
    expect(specWaivers(spec("> waive: form-fields\n"))).toEqual([]); // no reason: not a recordable waiver
  });
  it("apply records waivers in the lock, deterministically", () => {
    const text = apply(spec(W)).files.find((f) => f.path === ".ui.lock")?.content as string;
    const lock = parseLock(text).lock;
    expect(lock?.waivers).toEqual([
      { anchor: "pay", line: 8, reason: "two fields needed", rule: "form-fields" },
    ]);
    expect(apply(spec(W), text).files.find((f) => f.path === ".ui.lock")?.content).toBe(text);
  });
  it("audit: new, removed and re-worded waivers", () => {
    const lock = specWaivers(spec(W));
    expect(auditWaivers(specWaivers(spec(W)), lock)).toEqual({
      unrecorded: [],
      removed: [],
      changed: [],
    });
    expect(auditWaivers([], lock).removed).toHaveLength(1);
    expect(auditWaivers(lock, []).unrecorded).toHaveLength(1);
    const edited = specWaivers(spec(W.replace("two fields needed", "legal")));
    expect(auditWaivers(edited, lock).changed[0]?.now.reason).toBe("legal");
  });
});
