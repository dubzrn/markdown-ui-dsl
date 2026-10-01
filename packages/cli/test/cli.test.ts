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
