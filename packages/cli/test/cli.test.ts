import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EXIT, expand, globToRegExp, main, type Io } from "../src/index.js";

function memIo(files: Record<string, string>, cwd = "/proj") {
  const out: string[] = [];
  const err: string[] = [];
  const io: Io = {
    cwd,
    stdout: (s) => void out.push(s),
    stderr: (s) => void err.push(s),
    readFile: (p) => files[p],
    readDir: (p) => {
      const prefix = p.endsWith("/") ? p : `${p}/`;
      const names = new Map<string, boolean>();
      for (const f of Object.keys(files)) {
        if (!f.startsWith(prefix)) continue;
        const rest = f.slice(prefix.length);
        const i = rest.indexOf("/");
        names.set(i === -1 ? rest : rest.slice(0, i), i !== -1);
      }
      return names.size === 0 ? undefined : [...names].map(([name, isDir]) => ({ name, isDir }));
    },
    writeFile: (p, t) => void (files[p] = t),
    removeFile: (p) => void Reflect.deleteProperty(files, p),
  };
  return { io, out: () => out.join(""), err: () => err.join("") };
}

const GOOD = "::: CARD :::\nhello\n--- END ---\n";
const BAD = "::: CARD :::\nhello\n";
const WARN = "> @xs a: b\n";

describe("exit codes and output (T-027)", () => {
  it("0 on a clean file", () => {
    const m = memIo({ "/proj/a.ui.md": GOOD });
    expect(main(["validate", "a.ui.md"], m.io)).toBe(EXIT.ok);
    expect(m.out()).toContain("0 error(s)");
  });
  it("1 on an error diagnostic", () => {
    const m = memIo({ "/proj/a.ui.md": BAD });
    expect(main(["validate", "a.ui.md"], m.io)).toBe(EXIT.diagnostics);
    expect(m.out()).toContain("a.ui.md:1:1 error E1001");
  });
  it("warnings do not fail by default but do with --fail-on warn", () => {
    const files = { "/proj/a.ui.md": WARN };
    expect(main(["validate", "a.ui.md"], memIo(files).io)).toBe(EXIT.ok);
    expect(main(["validate", "a.ui.md", "--fail-on", "warn"], memIo(files).io)).toBe(
      EXIT.diagnostics,
    );
    expect(
      main(["validate", "a.ui.md", "--fail-on=none"], memIo({ "/proj/a.ui.md": BAD }).io),
    ).toBe(EXIT.ok);
  });
  it("2 on usage errors", () => {
    const cases: string[][] = [
      [],
      ["bogus"],
      ["validate"],
      ["validate", "missing.ui.md"],
      ["validate", "--wat", "x"],
      ["validate", "a.ui.md", "--fail-on", "loud"],
      ["validate", "--fail-on"],
    ];
    for (const c of cases) {
      const m = memIo({ "/proj/a.ui.md": GOOD });
      expect(main(c, m.io), c.join(" ")).toBe(EXIT.usage);
    }
  });
  it("2 on config errors", () => {
    const bad = [
      `{`,
      `[]`,
      `{"nope":1}`,
      `{"failOn":"loud"}`,
      `{"rules":{"x":"loud"}}`,
      `{"root":5}`,
    ];
    for (const cfg of bad) {
      const m = memIo({ "/proj/a.ui.md": GOOD, "/proj/mdui.config.json": cfg });
      expect(main(["validate", "a.ui.md"], m.io), cfg).toBe(EXIT.usage);
    }
    expect(
      main(["validate", "a.ui.md", "--config", "none.json"], memIo({ "/proj/a.ui.md": GOOD }).io),
    ).toBe(EXIT.usage);
  });
  it("3 on an internal error (and never throws)", () => {
    const m = memIo({ "/proj/a.ui.md": GOOD });
    m.io.readFile = (p) => {
      if (p.endsWith("a.ui.md")) return GOOD;
      throw new Error("disk exploded");
    };
    expect(main(["validate", "a.ui.md"], m.io)).toBe(EXIT.internal);
    expect(m.err()).toContain("internal error");
  });
  it("--help and --version exit 0", () => {
    expect(main(["--help"], memIo({}).io)).toBe(EXIT.ok);
    const m = memIo({});
    expect(main(["--version"], m.io)).toBe(EXIT.ok);
    expect(m.out()).toMatch(/^\d+\.\d+\.\d+/);
  });
  it("--json output has the documented shape", () => {
    const m = memIo({ "/proj/a.ui.md": BAD, "/proj/b.ui.md": GOOD });
    main(["validate", "--json", "a.ui.md", "b.ui.md"], m.io);
    const j = JSON.parse(m.out()) as {
      tool: string;
      version: number;
      command: string;
      files: {
        file: string;
        diagnostics: {
          code: string;
          severity: string;
          line: number;
          col: number;
          endLine: number;
          endCol: number;
        }[];
      }[];
      summary: { files: number; errors: number; warnings: number; infos: number };
    };
    expect(j.tool).toBe("mdui");
    expect(j.version).toBe(1);
    expect(j.summary).toEqual({ files: 2, errors: 1, warnings: 0, infos: 0 });
    expect(j.files[0]?.diagnostics[0]).toMatchObject({
      code: "E1001",
      severity: "error",
      line: 1,
      col: 1,
    });
    expect(j.files[1]?.diagnostics).toEqual([]);
  });
  it("lint adds rules and honours config", () => {
    const files = { "/proj/a.ui.md": "::: CARD :::\n--- END ---\n" };
    const m = memIo(files);
    expect(main(["lint", "a.ui.md"], m.io)).toBe(EXIT.ok);
    expect(m.out()).toContain("[empty-container]");
    const strict = memIo({
      ...files,
      "/proj/mdui.config.json": `{"rules":{"empty-container":"error"}}`,
    });
    expect(main(["lint", "a.ui.md"], strict.io)).toBe(EXIT.diagnostics);
    const off = memIo({
      ...files,
      "/proj/mdui.config.json": `{"rules":{"empty-container":"off"}}`,
    });
    expect(main(["lint", "a.ui.md"], off.io)).toBe(EXIT.ok);
    expect(off.out()).not.toContain("empty-container");
  });
  it("validate resolves includes and data relative to root", () => {
    const files = {
      "/proj/main.ui.md": "---\ndsl: 2.0\n---\n[[ USE: ./nav.ui.md ]]\n",
      "/proj/nav.ui.md": "---\ndsl: 2.0\ntype: partial\n---\nnav\n",
    };
    expect(main(["validate", "main.ui.md"], memIo(files).io)).toBe(EXIT.ok);
    const broken = { "/proj/main.ui.md": files["/proj/main.ui.md"] };
    const m = memIo(broken);
    expect(main(["validate", "main.ui.md"], m.io)).toBe(EXIT.diagnostics);
    expect(m.out()).toContain("E2304");
  });
  it("ast prints the document JSON and rejects multiple files", () => {
    const m = memIo({ "/proj/a.ui.md": GOOD, "/proj/b.ui.md": GOOD });
    expect(main(["ast", "a.ui.md", "--compact"], m.io)).toBe(EXIT.ok);
    const doc = JSON.parse(m.out()) as { dsl: string; body: { kind: string }[] };
    expect(doc.dsl).toBe("1");
    expect(doc.body[0]?.kind).toBe("card");
    expect(
      main(
        ["ast", "a.ui.md", "b.ui.md"],
        memIo({ "/proj/a.ui.md": GOOD, "/proj/b.ui.md": GOOD }).io,
      ),
    ).toBe(EXIT.usage);
  });
});

describe("fmt", () => {
  const MESSY = "# Hi  \n\n\n[ Go ]( #go )\n";
  it("--check exits 1 and does not write; plain fmt rewrites and is then clean", () => {
    const files: Record<string, string> = { "/proj/a.ui.md": MESSY };
    const m = memIo(files);
    expect(main(["fmt", "--check", "a.ui.md"], m.io)).toBe(EXIT.diagnostics);
    expect(m.out()).toContain("would reformat a.ui.md");
    expect(files["/proj/a.ui.md"]).toBe(MESSY);
    expect(main(["fmt", "a.ui.md"], memIo(files).io)).toBe(EXIT.ok);
    expect(files["/proj/a.ui.md"]).toBe("# Hi\n\n[ Go ](#go)\n");
    expect(main(["fmt", "--check", "a.ui.md"], memIo(files).io)).toBe(EXIT.ok);
  });
});

describe("lint --fix and rules", () => {
  it("--fix applies safe fixes in place and reports what remains", () => {
    const files: Record<string, string> = { "/proj/a.ui.md": "a\n--- END ---\n::: CARD :::\nx\n" };
    const m = memIo(files);
    expect(main(["lint", "--fix", "a.ui.md"], m.io)).toBe(EXIT.ok);
    expect(files["/proj/a.ui.md"]).toBe("a\n::: CARD :::\nx\n--- END ---\n");
    expect(main(["lint", "a.ui.md"], memIo(files).io)).toBe(EXIT.ok);
  });
  it("without --fix nothing is written", () => {
    const src = "--- END ---\nx\n";
    const files: Record<string, string> = { "/proj/a.ui.md": src };
    expect(main(["lint", "a.ui.md"], memIo(files).io)).toBe(EXIT.diagnostics);
    expect(files["/proj/a.ui.md"]).toBe(src);
  });
  it("unused suppressions are reported as info", () => {
    const m = memIo({ "/proj/a.ui.md": "<!-- mdui-disable link-text -->\nplain\n" });
    expect(main(["lint", "a.ui.md"], m.io)).toBe(EXIT.ok);
    expect(m.out()).toContain("I1501");
  });
  it("rules lists the catalogue (text and json)", () => {
    const m = memIo({});
    expect(main(["rules", "--json"], m.io)).toBe(EXIT.ok);
    const j = JSON.parse(m.out()) as { rules: { id: string; wcag: string[] }[] };
    expect(j.rules.length).toBeGreaterThanOrEqual(30);
    expect(j.rules.find((r) => r.id === "img-alt")?.wcag).toEqual(["1.1.1"]);
    const t = memIo({});
    main(["rules"], t.io);
    expect(t.out()).toMatch(/\d+ rules\n$/);
  });
});

describe("diff and migrate", () => {
  it("diff prints changes and exits 1 on a regression", () => {
    const files = {
      "/proj/a.ui.md": "[Pricing](/p)\n",
      "/proj/b.ui.md": "[Pricing](/p)\n[click here](/x)\n",
      "/proj/c.ui.md": "[Pricing](/p)\n[ Go ](#go)\n",
    };
    const bad = memIo(files);
    expect(main(["diff", "a.ui.md", "b.ui.md"], bad.io)).toBe(EXIT.diagnostics);
    expect(bad.out()).toContain("REGRESSION: accessibility rule newly failing: link-text");
    const ok = memIo(files);
    expect(main(["diff", "a.ui.md", "c.ui.md"], ok.io)).toBe(EXIT.ok);
    expect(ok.out()).toContain('+ button "Go" (line 2)');
    const j = memIo(files);
    main(["diff", "--json", "a.ui.md", "c.ui.md"], j.io);
    expect(JSON.parse(j.out())).toMatchObject({
      command: "diff",
      summary: { added: 1, removed: 0, changed: 0, moved: 0 },
      regressions: [],
    });
    expect(main(["diff", "a.ui.md"], memIo(files).io)).toBe(EXIT.usage);
  });
  it("migrate is a dry run until --write; manual items block it unless --force", () => {
    const files: Record<string, string> = {
      "/proj/a.ui.md": "[ text: 2026-03-15 ]\n",
      "/proj/m.ui.md": "price {{ x }}\n",
    };
    const dry = memIo(files);
    expect(main(["migrate", "a.ui.md"], dry.io)).toBe(EXIT.ok);
    expect(dry.out()).toContain("dry run");
    expect(files["/proj/a.ui.md"]).toBe("[ text: 2026-03-15 ]\n");
    expect(main(["migrate", "--write", "a.ui.md"], memIo(files).io)).toBe(EXIT.ok);
    expect(files["/proj/a.ui.md"]).toContain("dsl: 2.0");
    expect(files["/proj/a.ui.md"]).toContain("[ DATE: 2026-03-15 ]");
    const blocked = memIo(files);
    expect(main(["migrate", "--write", "m.ui.md"], blocked.io)).toBe(EXIT.diagnostics);
    expect(blocked.out()).toContain("MANUAL");
    expect(files["/proj/m.ui.md"]).toBe("price {{ x }}\n");
    expect(main(["migrate", "--write", "--force", "m.ui.md"], memIo(files).io)).toBe(EXIT.ok);
    expect(files["/proj/m.ui.md"]).toContain("dsl: 2.0");
  });
});

describe("tokens", () => {
  const DS = `---\nname: T\ncolors:\n  primary: "#ffff00"\n  ink: "#ffffff"\n  dead: "{colors.nope}"\ncomponents:\n  btn:\n    backgroundColor: "{colors.primary}"\n    textColor: "{colors.ink}"\n---\n`;
  const GOOD = `---\nname: T\ncolors:\n  primary: "#000000"\n  ink: "#ffffff"\ncomponents:\n  btn:\n    backgroundColor: "{colors.primary}"\n    textColor: "{colors.ink}"\n---\n`;
  it("lint reports token rules and exits 1 on errors", () => {
    const m = memIo({ "/proj/DESIGN.md": DS, "/proj/OK.md": GOOD });
    expect(main(["tokens", "lint", "DESIGN.md"], m.io)).toBe(EXIT.diagnostics);
    expect(m.out()).toContain("[broken-ref]");
    expect(m.out()).toContain("[contrast-ratio]");
    expect(main(["tokens", "lint", "OK.md"], memIo({ "/proj/OK.md": GOOD }).io)).toBe(EXIT.ok);
  });
  it("export writes DTCG / tailwind / css and validates DTCG", () => {
    const files = { "/proj/OK.md": GOOD };
    const d = memIo(files);
    expect(main(["tokens", "export", "OK.md", "--to", "dtcg"], d.io)).toBe(EXIT.ok);
    expect(JSON.parse(d.out())).toMatchObject({
      colors: { primary: { $value: { hex: "#000000" } } },
    });
    const t4 = memIo(files);
    main(["tokens", "export", "OK.md", "--to", "tailwind4"], t4.io);
    expect(t4.out()).toContain("--color-primary: #000000;");
    const out: Record<string, string> = { ...files };
    expect(
      main(["tokens", "export", "OK.md", "--to", "css", "--out", "t.css"], memIo(out).io),
    ).toBe(EXIT.ok);
    expect(out["/proj/t.css"]).toContain(":root {");
    expect(main(["tokens", "export", "OK.md", "--to", "yaml"], memIo(files).io)).toBe(EXIT.usage);
  });
  it("diff exits 1 when a change breaks contrast", () => {
    const worse = GOOD.replace('"#000000"', '"#eeeeee"');
    const m = memIo({ "/proj/a.md": GOOD, "/proj/b.md": worse });
    expect(main(["tokens", "diff", "a.md", "b.md"], m.io)).toBe(EXIT.diagnostics);
    expect(m.out()).toContain("REGRESSION: contrast newly fails AA");
    expect(main(["tokens"], memIo({}).io)).toBe(EXIT.usage);
    expect(main(["tokens", "wat", "a.md"], memIo({ "/proj/a.md": GOOD }).io)).toBe(EXIT.usage);
  });
});

describe("render", () => {
  it("writes HTML to stdout or --out, honours --style/--state, exits 1 on errors", () => {
    const src =
      "---\ndsl: 2.0\n---\n::: REGION r :::\n::: STATE default :::\nA\n--- END ---\n::: STATE empty :::\nB\n--- END ---\n--- END ---\n";
    const m = memIo({ "/proj/a.ui.md": src });
    expect(main(["render", "a.ui.md", "--style", "wireframe", "--state", "empty"], m.io)).toBe(
      EXIT.ok,
    );
    expect(m.out()).toContain("mdui-style-wireframe");
    expect(m.out()).toContain('data-state="empty"');
    const files: Record<string, string> = { "/proj/a.ui.md": GOOD };
    expect(main(["render", "a.ui.md", "--out", "out/a.html"], memIo(files).io)).toBe(EXIT.ok);
    expect(files["/proj/out/a.html"]).toContain("<!doctype html>");
    expect(main(["render", "a.ui.md", "--style", "neon"], memIo(files).io)).toBe(EXIT.usage);
    expect(main(["render", "a.ui.md", "--theme", "blue"], memIo(files).io)).toBe(EXIT.usage);
    expect(
      main(["render", "a.ui.md", "b.ui.md"], memIo({ ...files, "/proj/b.ui.md": GOOD }).io),
    ).toBe(EXIT.usage);
    expect(main(["render", "bad.ui.md"], memIo({ "/proj/bad.ui.md": BAD }).io)).toBe(
      EXIT.diagnostics,
    );
  });
});

describe("glob and file expansion", () => {
  const files = {
    "/proj/a.ui.md": GOOD,
    "/proj/sub/b.ui.md": GOOD,
    "/proj/sub/deep/c.ui.md": GOOD,
    "/proj/sub/readme.md": "x",
    "/proj/node_modules/x/n.ui.md": GOOD,
    "/proj/reference/r.ui.md": GOOD,
  };
  it("directory ⇒ every .ui.md, skipping vendored dirs", () => {
    expect(expand(memIo(files).io, ["."]).files).toEqual([
      "a.ui.md",
      "sub/b.ui.md",
      "sub/deep/c.ui.md",
    ]);
    expect(expand(memIo(files).io, ["sub"]).files).toEqual(["sub/b.ui.md", "sub/deep/c.ui.md"]);
  });
  it("globs", () => {
    expect(expand(memIo(files).io, ["**/*.ui.md"]).files).toEqual(
      ["a.ui.md", "sub/b.ui.md", "sub/deep/c.ui.md", "node_modules/x/n.ui.md", "reference/r.ui.md"]
        .filter((f) => !f.startsWith("node_modules") && !f.startsWith("reference"))
        .sort(),
    );
    expect(expand(memIo(files).io, ["sub/*.ui.md"]).files).toEqual(["sub/b.ui.md"]);
    expect(expand(memIo(files).io, ["nothing/*.ui.md"]).missing).toEqual(["nothing/*.ui.md"]);
  });
  it("globToRegExp", () => {
    expect(globToRegExp("*.ui.md").test("a.ui.md")).toBe(true);
    expect(globToRegExp("*.ui.md").test("sub/a.ui.md")).toBe(false);
    expect(globToRegExp("**/*.ui.md").test("sub/deep/a.ui.md")).toBe(true);
    expect(globToRegExp("**/*.ui.md").test("a.ui.md")).toBe(true);
    expect(globToRegExp("a?.md").test("ab.md")).toBe(true);
  });
});

describe("built binary", () => {
  const bin = new URL("../dist/bin.js", import.meta.url).pathname;
  it.skipIf(!existsSync(bin))("runs end to end with real exit codes", () => {
    const dir = mkdtempSync(join(tmpdir(), "mdui-"));
    writeFileSync(join(dir, "good.ui.md"), GOOD);
    writeFileSync(join(dir, "bad.ui.md"), BAD);
    expect(
      execFileSync("node", [bin, "validate", "good.ui.md"], { cwd: dir }).toString(),
    ).toContain("0 error(s)");
    const r = spawnSync("node", [bin, "validate", "bad.ui.md"], { cwd: dir });
    expect(r.status).toBe(1);
    expect(r.stdout.toString()).toContain("E1001");
    expect(spawnSync("node", [bin, "nope"], { cwd: dir }).status).toBe(2);
  });

  describe("prompt (T-054)", () => {
    const files = {
      "/proj/a.ui.md": "::: CARD :::\n[ Go ](#go)\n--- END ---\n",
    };
    it("composes a deterministic prompt", () => {
      const a = memIo({ ...files });
      const b = memIo({ ...files });
      expect(main(["prompt", "a.ui.md"], a.io)).toBe(EXIT.ok);
      expect(main(["prompt", "a.ui.md"], b.io)).toBe(EXIT.ok);
      expect(a.out()).toBe(b.out());
      expect(a.out()).toMatch(/CARD/);
      expect(a.out()).not.toMatch(/CHART/);
    });
    it("rejects an unknown agent and a missing file", () => {
      const m = memIo({ ...files });
      expect(main(["prompt", "--agent", "nope", "a.ui.md"], m.io)).toBe(EXIT.usage);
      expect(main(["prompt", "missing.ui.md"], m.io)).toBe(EXIT.usage);
    });
    it("writes with --out", () => {
      const f: Record<string, string> = { ...files };
      const m = memIo(f);
      expect(main(["prompt", "--agent", "claude", "--out", "p.md", "a.ui.md"], m.io)).toBe(EXIT.ok);
      expect(f["/proj/p.md" as keyof typeof f]).toMatch(/^<markdown-ui-dsl>/);
    });
  });

  describe("grammar (T-058..T-060)", () => {
    it("emits Lark, GBNF and JSON Schema", () => {
      for (const [format, probe] of [
        ["lark", /^start: document$/m],
        ["gbnf", /^root ::= document$/m],
        ["json-schema", /"\$defs"/],
      ] as const) {
        const m = memIo({});
        expect(main(["grammar", "--format", format], m.io)).toBe(EXIT.ok);
        expect(m.out()).toMatch(probe);
      }
    });
    it("is deterministic and honours --dsl and --max-depth", () => {
      const a = memIo({});
      const b = memIo({});
      main(["grammar", "--dsl", "1", "--max-depth", "2"], a.io);
      main(["grammar", "--dsl", "1", "--max-depth", "2"], b.io);
      expect(a.out()).toBe(b.out());
      expect(a.out()).toMatch(/blocks_2/);
      expect(a.out()).not.toMatch(/SLIDER/);
    });
    it("a catalog restricts the components", () => {
      const m = memIo({
        "/proj/c.yaml":
          "builtins: [COLUMN, CARD]\ncomponents:\n  Rating:\n    props:\n      value: { type: number, positional: 0 }\n",
      });
      expect(main(["grammar", "--catalog", "c.yaml"], m.io)).toBe(EXIT.ok);
      expect(m.out()).toMatch(/RATING/);
      expect(m.out()).not.toMatch(/CHART|SLIDER|ACCORDION/);
    });
    it("rejects bad options", () => {
      const m = memIo({});
      expect(main(["grammar", "--format", "nope"], m.io)).toBe(EXIT.usage);
      expect(main(["grammar", "--dsl", "3"], m.io)).toBe(EXIT.usage);
      expect(main(["grammar", "--max-depth", "0"], m.io)).toBe(EXIT.usage);
      expect(main(["grammar", "--catalog", "missing.yaml"], m.io)).toBe(EXIT.usage);
    });
  });

  describe("coverage (T-056)", () => {
    const files = {
      "/proj/req.md": "- **FR-001**: a\n- **FR-002**: b\n",
      "/proj/a.ui.md": "---\ndsl: 2.0\nrequirements: [FR-001]\n---\nx\n",
    };
    it("exits 1 and lists what is uncovered", () => {
      const m = memIo({ ...files });
      expect(main(["coverage", "--requirements", "req.md", "a.ui.md"], m.io)).toBe(
        EXIT.diagnostics,
      );
      expect(m.out()).toMatch(/uncovered: FR-002/);
      expect(m.out()).toMatch(/1\/2/);
    });
    it("exits 0 when everything is covered, and prints JSON", () => {
      const m = memIo({
        ...files,
        "/proj/b.ui.md": "---\ndsl: 2.0\nrequirements: [FR-002]\n---\nx\n",
      });
      expect(
        main(["coverage", "--json", "--requirements", "req.md", "a.ui.md", "b.ui.md"], m.io),
      ).toBe(EXIT.ok);
      expect(JSON.parse(m.out())).toMatchObject({ command: "coverage", uncovered: [] });
    });
    it("needs --requirements", () => {
      expect(main(["coverage", "a.ui.md"], memIo({ ...files }).io)).toBe(EXIT.usage);
    });
  });

  describe("constraints and waivers (T-079, T-082)", () => {
    const spec =
      '---\ndsl: 2.0\nlang: en\n---\n::: CARD :::\n> waive: form-fields reason="two fields are needed"\n[ text: a ]{: label="a" }\n[ text: b ]{: label="b" }\n--- END ---\n';
    it("project-level constraints come from mdui.config.json", () => {
      const m = memIo({
        "/proj/mdui.config.json": JSON.stringify({ constraints: { "form-fields": 1 } }),
        "/proj/a.ui.md": spec.replace('> waive: form-fields reason="two fields are needed"\n', ""),
      });
      expect(main(["lint", "--fail-on", "warn", "a.ui.md"], m.io)).toBe(EXIT.diagnostics);
      expect(m.out()).toMatch(/W5302/);
    });
    it("--audit-waivers lists the waiver, in text and JSON", () => {
      const files = {
        "/proj/mdui.config.json": JSON.stringify({ constraints: { "form-fields": 1 } }),
        "/proj/a.ui.md": spec,
      };
      const t = memIo({ ...files });
      expect(main(["lint", "--audit-waivers", "a.ui.md"], t.io)).toBe(EXIT.ok);
      expect(t.out()).toMatch(/waiver form-fields \(1 suppressed\): two fields are needed/);
      const j = memIo({ ...files });
      main(["lint", "--audit-waivers", "--json", "a.ui.md"], j.io);
      expect(JSON.parse(j.out()).files[0].waivers).toEqual([
        { rule: "form-fields", reason: "two fields are needed", line: 6, suppressed: 1 },
      ]);
    });
    it("rejects a malformed constraints config", () => {
      const m = memIo({ "/proj/mdui.config.json": '{"constraints": 5}', "/proj/a.ui.md": "x\n" });
      expect(main(["lint", "a.ui.md"], m.io)).toBe(EXIT.usage);
    });
  });

  describe("sync (T-074)", () => {
    const spec =
      "---\ndsl: 2.0\nlang: en\n---\n::: CARD :::{: #login }\n## Sign in\n[ Go ](#go)\n--- END ---\n";
    const html = '<section data-mdui-anchor="login"><h2>Sign in</h2><button>Go</button></section>';
    const files = () => ({ "/proj/a.ui.md": spec, "/proj/a.html": html });
    it("plan is read-only; apply needs --confirm; then everything is clean", () => {
      const f = files();
      const m = memIo(f);
      expect(main(["sync", "plan", "a.ui.md", "--code", "a.html"], m.io)).toBe(EXIT.ok);
      expect(m.out()).toMatch(/login\s+converged/);
      expect(f["/proj/.ui.lock" as keyof typeof f]).toBeUndefined();
      expect(main(["sync", "apply", "a.ui.md", "--code", "a.html"], m.io)).toBe(EXIT.usage);
      expect(main(["sync", "apply", "a.ui.md", "--code", "a.html", "--confirm"], m.io)).toBe(
        EXIT.ok,
      );
      expect(f["/proj/.ui.lock" as keyof typeof f]).toMatch(/"version": 1/);
      const again = memIo(f);
      expect(main(["sync", "plan", "--check", "a.ui.md", "--code", "a.html"], again.io)).toBe(
        EXIT.ok,
      );
      expect(again.out()).toMatch(/login\s+clean/);
    });
    it("--check exits 1 on drift, and --json carries the plan", () => {
      const f = files();
      main(["sync", "apply", "a.ui.md", "--code", "a.html", "--confirm"], memIo(f).io);
      f["/proj/a.html"] = html.replace("Go", "Proceed");
      const m = memIo(f);
      expect(main(["sync", "plan", "--check", "--json", "a.ui.md", "--code", "a.html"], m.io)).toBe(
        EXIT.diagnostics,
      );
      expect(JSON.parse(m.out()).entries[0]).toMatchObject({
        anchor: "login",
        class: "code-ahead",
      });
    });
    it("apply patches the spec from code-ahead changes", () => {
      const f = files();
      main(["sync", "apply", "a.ui.md", "--code", "a.html", "--confirm"], memIo(f).io);
      f["/proj/a.html"] = html.replace("Go", "Proceed");
      expect(main(["sync", "apply", "a.ui.md", "--code", "a.html", "--confirm"], memIo(f).io)).toBe(
        EXIT.ok,
      );
      expect(f["/proj/a.ui.md"]).toContain("[ Proceed ]");
    });
    it("rejects a missing subcommand, spec or --code", () => {
      const m = memIo(files());
      expect(main(["sync"], m.io)).toBe(EXIT.usage);
      expect(main(["sync", "plan", "nope.ui.md", "--code", "a.html"], m.io)).toBe(EXIT.usage);
      expect(main(["sync", "plan", "a.ui.md"], m.io)).toBe(EXIT.usage);
    });
    it("relink renames an anchor in the lock", () => {
      const f = files();
      main(["sync", "apply", "a.ui.md", "--code", "a.html", "--confirm"], memIo(f).io);
      expect(main(["sync", "relink", "login", "signin"], memIo(f).io)).toBe(EXIT.ok);
      expect(f["/proj/.ui.lock" as keyof typeof f]).toContain('"signin"');
    });
  });

  describe("waiver audit against the lock (T-072)", () => {
    const base =
      '---\ndsl: 2.0\nlang: en\nconstraints:\n  form-fields: 1\n---\n::: CARD :::{: #pay }\n> waive: form-fields reason="two fields needed"\n[ text: a ]{: label="a" }\n[ text: b ]{: label="b" }\n--- END ---\n';
    it("reports waivers added or removed since the lock was written", () => {
      const f: Record<string, string> = { "/proj/a.ui.md": base, "/proj/a.html": "<x>" };
      // the unit has no code yet (orphan-spec: left alone, exit 1) but the lock, with its waiver, is written
      main(["sync", "apply", "a.ui.md", "--code", "a.html", "--confirm"], memIo(f).io);
      expect(f["/proj/.ui.lock"]).toContain('"form-fields"');
      const clean = memIo(f);
      main(["lint", "--audit-waivers", "a.ui.md"], clean.io);
      expect(clean.out()).not.toMatch(/not in the lock|removed since/);
      f["/proj/a.ui.md"] = base.replace('> waive: form-fields reason="two fields needed"\n', "");
      const removed = memIo(f);
      main(["lint", "--audit-waivers", "a.ui.md"], removed.io);
      expect(removed.out()).toMatch(/removed since the lock: waive form-fields in pay/);
      expect(removed.out()).toMatch(/W5302/);
    });
  });
});

describe("export (T-090, T-091)", () => {
  const src = "---\ndsl: 2.0\nlang: en\n---\n# Hi\n[ Go ](#go)\n[ CHART: bar data=d ]\n";
  const files: Record<string, string> = { "/proj/a.ui.md": src };
  it("writes A2UI messages to stdout and warnings to stderr", () => {
    const m = memIo(files);
    expect(main(["export", "a.ui.md", "--to", "a2ui"], m.io)).toBe(EXIT.ok);
    const msgs = JSON.parse(m.out()) as { version: string }[];
    expect(msgs[0]).toMatchObject({ version: "v1.0", createSurface: { surfaceId: "surface-1" } });
    expect(m.err()).toMatch(/a\.ui\.md:\d+ degraded \[ CHART \]/);
  });
  it("writes a json-render spec and catalog with --out", () => {
    const f: Record<string, string> = { ...files };
    expect(
      main(["export", "a.ui.md", "--to", "json-render", "--out", "o/a.json"], memIo(f).io),
    ).toBe(EXIT.ok);
    const j = JSON.parse(f["/proj/o/a.json"] as string) as {
      spec: { root: string };
      catalog: { name: string };
    };
    expect(j.spec.root).toMatch(/^e\d+$/);
    expect(j.catalog.name).toBe("mdui");
  });
  it("--strict fails when anything degrades; usage errors exit 2", () => {
    expect(main(["export", "a.ui.md", "--to", "a2ui", "--strict"], memIo(files).io)).toBe(
      EXIT.diagnostics,
    );
    expect(main(["export", "a.ui.md"], memIo(files).io)).toBe(EXIT.usage);
    expect(main(["export", "a.ui.md", "--to", "figma"], memIo(files).io)).toBe(EXIT.usage);
  });
});

describe("stats (T-095)", () => {
  it("reports size, block and control counts, as text and JSON", () => {
    const files = { "/proj/a.ui.md": "::: CARD :::\n# Hi\n[ Go ](#go)\n--- END ---\n" };
    const m = memIo(files);
    expect(main(["stats", "a.ui.md"], m.io)).toBe(EXIT.ok);
    expect(m.out()).toMatch(/a\.ui\.md: \d+ bytes, \d+ lines, ~\d+ tokens/);
    const j = memIo(files);
    main(["stats", "a.ui.md", "--json"], j.io);
    const r = JSON.parse(j.out()) as {
      files: { blocks: Record<string, number>; inline: Record<string, number> }[];
    };
    expect(r.files[0]?.blocks).toMatchObject({ card: 1, heading: 1 });
    expect(r.files[0]?.inline).toMatchObject({ button: 1 });
  });
});

describe("svg and embed (T-094)", () => {
  const spec = "# Hi\n[ Go ](#go)\n";
  it("svg writes a self-contained SVG, validating options", () => {
    const m = memIo({ "/proj/a.ui.md": spec });
    expect(main(["svg", "a.ui.md", "--style", "sketch", "--width", "480"], m.io)).toBe(EXIT.ok);
    expect(m.out()).toMatch(/^<svg [^>]*width="480"/);
    const f: Record<string, string> = { "/proj/a.ui.md": spec };
    expect(main(["svg", "a.ui.md", "--out", "o/a.svg"], memIo(f).io)).toBe(EXIT.ok);
    expect(f["/proj/o/a.svg"]).toContain("<title");
    for (const bad of [
      ["--style", "neon"],
      ["--theme", "blue"],
      ["--width", "10"],
    ])
      expect(main(["svg", "a.ui.md", ...bad], memIo({ "/proj/a.ui.md": spec }).io)).toBe(
        EXIT.usage,
      );
  });
  it("embed replaces mdui fences with image embeds and writes the SVGs next to the output", () => {
    const f: Record<string, string> = {
      "/proj/docs/R.md": "# R\n\n```mdui\n# Hi\n[ Go ](#go)\n```\n",
    };
    const m = memIo(f);
    expect(main(["embed", "docs/R.md", "--write", "--out-dir", "img"], m.io)).toBe(EXIT.ok);
    expect(f["/proj/docs/R.md"]).toMatch(/!\[Hi\]\(img\/[0-9a-f]{8}\.svg\)/);
    const svg = Object.keys(f).find((k) => k.startsWith("/proj/docs/img/"));
    expect(f[svg as string]).toMatch(/^<svg /);
    expect(main(["embed", "docs/missing.md"], memIo({}).io)).toBe(EXIT.usage);
  });
});
