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
});
