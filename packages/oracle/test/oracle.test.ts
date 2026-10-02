import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "@mdui/core";
import { chromium } from "playwright-core";
import {
  expectedTree,
  judge,
  match,
  parseAriaSnapshot,
  parseBaseline,
  toAriaYaml,
  toBaseline,
  verifyConstraints,
  verifyPage,
  readBoxes,
  type Actual,
} from "../src/index.js";

const H = "---\ndsl: 2.0\nlang: en\n---\n";
const exp = (s: string, o = {}) =>
  expectedTree(parse(`${H}${s}`), o).map(
    (e) =>
      `${e.role}${e.name !== "" ? `:${e.name}` : ""}${e.level !== undefined ? `#${e.level}` : ""}`,
  );

describe("expected tree (T-076)", () => {
  it("maps every primitive to a role and name", () => {
    expect(
      exp(
        `::: HEADER :::\n# Shop\n--- END ---\n[ Buy ](#b)\n[Docs](/d)\n[ text: Email ]{: label="Email address" }\n[ text: Phone ]\n[x] Agree\n( ) Pick\n[on] Dark\n[v] Size {S, M}\n[ IMG: Logo ]\n|[ A ]| B |\n::: MODAL :::\n## Sure?\n--- END ---\n::: FOOTER :::\n--- END ---\n`,
      ),
    ).toEqual([
      "banner",
      "heading:Shop#1",
      "button:Buy",
      "link:Docs",
      "textbox:Email address",
      "textbox:Phone",
      "checkbox:Agree",
      "radio:Pick",
      "switch:Dark",
      "combobox:Size",
      "img:Logo",
      "tablist",
      "tab:A",
      "tab:B",
      "dialog",
      "heading:Sure?#2",
      "contentinfo",
    ]);
  });
  it("only a page-level HEADER/FOOTER is a landmark; one inside content or mid-page is a section header", () => {
    expect(exp("::: HEADER :::\n--- END ---\n# T\n::: FOOTER :::\n--- END ---\n")).toEqual([
      "banner",
      "heading:T#1",
      "contentinfo",
    ]);
    expect(exp("# T\n::: HEADER :::\n--- END ---\n[ B ](#b)\n")).toEqual([
      "heading:T#1",
      "button:B",
    ]);
    expect(exp("::: CARD :::\n::: HEADER :::\n--- END ---\n--- END ---\n")).toEqual([]);
  });
  it("a placeholder is optionally not a name", () => {
    expect(exp("[ text: Phone ]\n", { inputName: "none" })).toEqual(["textbox"]);
  });
  it("expands to one tree per state", () => {
    const src =
      "::: REGION r :::\n::: STATE default :::\n[ Ok ](#o)\n--- END STATE ---\n::: STATE error :::\n[ Retry ](#r)\n--- END STATE ---\n--- END REGION ---\n";
    expect(exp(src)).toEqual(["button:Ok"]);
    expect(exp(src, { state: "error" })).toEqual(["button:Retry"]);
  });
  it("weights follow the defaults and can be configured", () => {
    const e = expectedTree(parse(`${H}::: HEADER :::\n--- END ---\n# T\n[ B ](#b)\nplain\n`));
    expect(e.map((x) => x.weight)).toEqual([2, 2, 3, 1]);
    expect(
      expectedTree(parse(`${H}[ B ](#b)\n`), { weights: { interactive: 10 } })[0]?.weight,
    ).toBe(10);
  });
  it("emits an order-correct Playwright ARIA template", () => {
    expect(toAriaYaml(expectedTree(parse(`${H}# Hi\n[ Go ](#g)\n`)))).toBe(
      '- heading "Hi" [level=1]\n- button "Go"\n',
    );
  });
});

describe("snapshot parser", () => {
  it("handles Chromium's real output: escaped quotes, YAML-wrapped entries, paragraphs with inline children, links", () => {
    // captured from Chromium 1194 (see test comment): quotes are backslash-escaped, a colon forces single-quote wrapping
    const y = [
      '- heading "Say \\"hi\\" now" [level=2]',
      '- button "It\'s \\"ok\\""',
      '- link "back\\\\slash":',
      "  - /url: /x",
      "- 'heading \"A: b\" [level=3]'",
      "- paragraph:",
      "  - text: one",
      "  - strong: two",
      "  - text: three",
      '- checkbox "Agree" [checked]',
      "- text: loose",
    ].join("\n");
    expect(
      parseAriaSnapshot(y).map((a) => `${a.role}:${a.name}${a.level ? `#${a.level}` : ""}`),
    ).toEqual([
      'heading:Say "hi" now#2',
      'button:It\'s "ok"',
      "link:back\\slash",
      "heading:A: b#3",
      "text:one two three",
      "checkbox:Agree",
      "text:loose",
    ]);
  });
  it("never throws", () => {
    for (const s of [
      "",
      "- ",
      "-\n-",
      ": : :",
      "- 'unterminated",
      "  - x\n- y\n    - z",
      "\u0000".repeat(50),
      "- a ".repeat(5000),
    ])
      expect(() => parseAriaSnapshot(s)).not.toThrow();
  });
});

const A = (role: string, name = "", level?: number): Actual => ({
  role,
  name,
  ...(level !== undefined ? { level } : {}),
});
const e = (src: string) => expectedTree(parse(`${H}${src}`));

describe("matcher and Fidelity Score (T-077)", () => {
  const spec = e('# Title\n[ Save ](#s)\n[ text: Email ]{: label="Email" }\n');
  const full = [A("heading", "Title", 1), A("button", "Save"), A("textbox", "Email")];
  it("a faithful page scores 100%", () => {
    const r = match(spec, full);
    expect(r.fidelity).toBe(1);
    expect(r.verdicts.every((v) => v.verdict === "present")).toBe(true);
  });
  it("weights: interactive 3, heading 2", () => {
    const r = match(spec, [A("heading", "Title", 1), A("textbox", "Email")]);
    expect(r.matchedWeight).toBe(5);
    expect(r.expectedWeight).toBe(8);
    expect(r.fidelity).toBeCloseTo(5 / 8);
  });
  it("reports every verdict kind", () => {
    expect(
      match(spec, [A("heading", "Title", 1), A("textbox", "Email")]).verdicts[1]?.verdict,
    ).toBe("missing");
    expect(
      match(spec, [A("heading", "Title", 1), A("link", "Save"), A("textbox", "Email")]).verdicts[1],
    ).toMatchObject({ verdict: "role-mismatch", actual: { role: "link" } });
    expect(
      match(spec, [A("heading", "Title", 1), A("button", "Store"), A("textbox", "Email")])
        .verdicts[1]?.verdict,
    ).toBe("name-mismatch");
    expect(
      match(spec, [
        A("button", "Save"),
        A("heading", "Title", 1),
        A("textbox", "Email"),
      ]).verdicts.map((v) => v.verdict),
    ).toContain("order-mismatch");
  });
  it("a wrong heading level is not a match", () => {
    expect(
      match(spec, [A("heading", "Title", 2), A("button", "Save"), A("textbox", "Email")])
        .verdicts[0]?.verdict,
    ).not.toBe("present");
  });
  it("subset mode allows extras; strict mode reports them and cannot reach 100%", () => {
    const extra = [...full, A("button", "Surprise")];
    expect(match(spec, extra).fidelity).toBe(1);
    const s = match(spec, extra, { mode: "strict" });
    expect(s.extra.map((x) => x.name)).toEqual(["Surprise"]);
    expect(s.fidelity).toBeLessThan(1);
  });
  it("generic wrappers are ignored; names fold case and whitespace; loose mode accepts containment", () => {
    expect(
      match(spec, [
        A("generic"),
        A("heading", "TITLE", 1),
        A("group"),
        A("button", "  save "),
        A("textbox", "email"),
      ]).fidelity,
    ).toBe(1);
    expect(
      match(spec, [A("heading", "Title", 1), A("button", "Save changes"), A("textbox", "Email")])
        .fidelity,
    ).toBeLessThan(1);
    expect(
      match(spec, [A("heading", "Title", 1), A("button", "Save changes"), A("textbox", "Email")], {
        nameMatch: "loose",
      }).fidelity,
    ).toBe(1);
  });
  it("order-insensitive regions (the thing Playwright's native matcher cannot do)", () => {
    const two = e("[ A ](#a)\n[ B ](#b)\n");
    const swapped = [A("button", "B"), A("button", "A")];
    expect(match(two, swapped).fidelity).toBeLessThan(1);
    expect(match(two, swapped, { unorderedLines: new Set(two.map((x) => x.line)) }).fidelity).toBe(
      1,
    );
  });
  it("text lines match by containment and never consume the paragraph", () => {
    const t = e("first\nsecond\n");
    expect(match(t, [A("text", "first second")]).fidelity).toBe(1);
  });
  it("an empty spec scores 100%", () => expect(match([], full).fidelity).toBe(1));
  it("reproducible: same inputs, same score", () => {
    expect(match(spec, full).fidelity).toBe(match(spec, full).fidelity);
  });
});

describe("baselines and CI verdict (T-078)", () => {
  const spec = e("[ A ](#a)\n[ B ](#b)\n");
  const half = match(spec, [A("button", "A")]);
  it("fails below --min-fidelity, passes above", () => {
    expect(judge(half, { minFidelity: 0.9 }).ok).toBe(false);
    expect(judge(half, { minFidelity: 0.5 }).ok).toBe(true);
  });
  it("a baseline tolerates known divergences and fails on new ones", () => {
    const b = toBaseline(half);
    expect(parseBaseline(JSON.stringify(b))).toEqual(b);
    expect(judge(half, { baseline: b }).ok).toBe(true);
    const worse = match(spec, []);
    const j = judge(worse, { baseline: b });
    expect(j.ok).toBe(false);
    expect(j.reasons.join("\n")).toMatch(/new missing: button "A"/);
    expect(j.reasons.join("\n")).toMatch(/regressed/);
  });
  it("rejects a malformed baseline", () => {
    for (const t of ["", "{}", '{"version":2}', "[]", '{"version":1,"fidelity":1,"known":[1]}'])
      expect(parseBaseline(t)).toBeUndefined();
  });
});

describe("post-code constraints (T-080)", () => {
  const spec = `${H}::: HEADER :::\n--- END ---\n# Page\n[ text: Email ]{: label="Email" }\n[ Save ](#s)\n`;
  it("labels, heading order, landmarks, help and tap targets are verified and mapped to spec lines", () => {
    const actual = [
      A("textbox", ""),
      A("heading", "Page", 1),
      A("heading", "Deep", 3),
      A("button", "Save"),
    ];
    const v = verifyConstraints(spec, actual, {
      constraints: {
        "every-input-labelled": true,
        "heading-order": "strict",
        "landmarks-present": true,
        "help-reachable": true,
        "tap-target": { min: 44 },
      },
      boxes: [{ role: "button", name: "Save", width: 60, height: 20 }],
    });
    expect(v.map((x) => x.constraint).sort()).toEqual([
      "every-input-labelled",
      "heading-order",
      "help-reachable",
      "landmarks-present",
      "tap-target",
    ]);
    expect(v.find((x) => x.constraint === "tap-target")?.line).toBe(9);
  });
  it("silent when nothing is declared or the page complies", () => {
    expect(verifyConstraints(spec, [A("textbox", "")], { constraints: {} })).toEqual([]);
    expect(
      verifyConstraints(
        spec,
        [A("banner"), A("heading", "Page", 1), A("textbox", "Email"), A("link", "Help")],
        {
          constraints: {
            "every-input-labelled": true,
            "heading-order": true,
            "landmarks-present": true,
            "help-reachable": true,
          },
        },
      ),
    ).toEqual([]);
  });
});

const exe = ["/opt/pw-browsers/chromium", process.env["CHROMIUM_PATH"] ?? ""].find(
  (p) => p !== "" && existsSync(p),
);
describe.skipIf(exe === undefined)("in a real browser (Chromium)", () => {
  it("scores a live page, finds a seeded regression, and measures tap targets", async () => {
    const browser = await chromium.launch({ executablePath: exe as string });
    try {
      const page = await browser.newPage();
      const spec = `${H}# Sign in\n[ text: Email ]{: label="Email" }\n[ Sign in ](#go)\n`;
      await page.setContent(
        '<h1>Sign in</h1><label>Email <input></label><button style="width:30px;height:20px">Sign in</button>',
      );
      const good = await verifyPage(spec, page);
      expect(good.fidelity).toBe(1);
      const boxes = await readBoxes(page);
      expect(boxes.find((b) => b.role === "button")).toMatchObject({
        name: "Sign in",
        width: 30,
        height: 20,
      });
      await page.setContent("<h1>Sign in</h1><label>Email <input></label><div>Sign in</div>");
      const bad = await verifyPage(spec, page);
      expect(bad.fidelity).toBeLessThan(1);
      expect(bad.verdicts.find((v) => v.verdict !== "present")?.expected.line).toBe(7);
    } finally {
      await browser.close();
    }
  });
});
