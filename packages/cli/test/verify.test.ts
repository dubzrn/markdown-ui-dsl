import { describe, expect, it } from "vitest";
import { parseArgs } from "../src/args.js";
import { runVerify, type Driver } from "../src/verify.js";
import type { Io } from "../src/io.js";

function memIo(files: Record<string, string>) {
  const out: string[] = [];
  const io: Io = {
    cwd: "/proj",
    stdout: (s) => void out.push(s),
    stderr: () => undefined,
    readFile: (p) => files[p],
    readDir: () => undefined,
    writeFile: (p, t) => void (files[p] = t),
    removeFile: (p) => void Reflect.deleteProperty(files, p),
  };
  return { io, out: () => out.join(""), files };
}
const spec =
  "---\ndsl: 2.0\nlang: en\nconstraints:\n  heading-order: strict\n  tap-target: { min: 44 }\n---\n# Title\n[ Save ](#s)\n[ Cancel ](#c)\n";
const good: Driver = async () => ({
  actual: [
    { role: "heading", name: "Title", level: 1 },
    { role: "button", name: "Save" },
    { role: "button", name: "Cancel" },
  ],
  boxes: [
    { role: "button", name: "Save", width: 80, height: 48 },
    { role: "button", name: "Cancel", width: 80, height: 48 },
  ],
});
const regressed: Driver = async () => ({
  actual: [
    { role: "heading", name: "Title", level: 1 },
    { role: "button", name: "Save" },
  ],
  boxes: [{ role: "button", name: "Save", width: 20, height: 20 }],
});
const run = (argv: string[], io: Io, d: Driver) => runVerify(io, parseArgs(["verify", ...argv]), d);

describe("mdui verify (T-078)", () => {
  it("passes a faithful page and prints the score", async () => {
    const m = memIo({ "/proj/a.ui.md": spec, "/proj/a.html": "<x>" });
    expect(await run(["a.ui.md", "--html", "a.html", "--min-fidelity", "0.95"], m.io, good)).toBe(
      0,
    );
    expect(m.out()).toMatch(/fidelity 100.0%/);
  });
  it("--min-fidelity fails a regression and names what is wrong, with spec lines", async () => {
    const m = memIo({ "/proj/a.ui.md": spec, "/proj/a.html": "<x>" });
    expect(
      await run(["a.ui.md", "--html", "a.html", "--min-fidelity", "0.95"], m.io, regressed),
    ).toBe(1);
    expect(m.out()).toMatch(/a.ui.md:10 missing\s+button "Cancel"/);
    expect(m.out()).toMatch(/FAIL fidelity .* below the required 95.0%/);
    expect(m.out()).toMatch(/constraint tap-target/);
  });
  it("baseline: write once, then pass on the same page and fail on a new regression", async () => {
    const m = memIo({ "/proj/a.ui.md": spec, "/proj/a.html": "<x>" });
    expect(
      await run(
        ["a.ui.md", "--html", "a.html", "--baseline", "b.json", "--write-baseline"],
        m.io,
        regressed,
      ),
    ).toBe(0);
    expect(m.files["/proj/b.json"]).toMatch(/"known"/);
    const okAgain = memIo({ ...m.files });
    expect(
      await run(
        ["a.ui.md", "--html", "a.html", "--baseline", "b.json", "--json"],
        okAgain.io,
        regressed,
      ),
    ).toBe(1); // post-code constraint still violated
    const worse: Driver = async () => ({ actual: [], boxes: [] });
    const m2 = memIo({ ...m.files });
    expect(await run(["a.ui.md", "--html", "a.html", "--baseline", "b.json"], m2.io, worse)).toBe(
      1,
    );
    expect(m2.out()).toMatch(/new missing/);
  });
  it("--json carries fidelity, verdicts and constraints; --name-match loose; --strict", async () => {
    const m = memIo({ "/proj/a.ui.md": spec, "/proj/a.html": "<x>" });
    const loose: Driver = async () => ({
      actual: [
        { role: "heading", name: "Title", level: 1 },
        { role: "button", name: "Save changes" },
        { role: "button", name: "Cancel" },
      ],
      boxes: [],
    });
    await run(["a.ui.md", "--html", "a.html", "--json", "--name-match", "loose"], m.io, loose);
    expect(JSON.parse(m.out())).toMatchObject({ command: "verify", fidelity: 1, ok: true });
    const s = memIo({ "/proj/a.ui.md": spec, "/proj/a.html": "<x>" });
    const extra: Driver = async () => ({
      actual: [...(await good({}, undefined)).actual, { role: "button", name: "Surprise" }],
      boxes: [],
    });
    expect(
      await run(["a.ui.md", "--html", "a.html", "--strict", "--min-fidelity", "1"], s.io, extra),
    ).toBe(1);
    expect(s.out()).toMatch(/extra\s+button "Surprise"/);
  });
  it("usage errors", async () => {
    const m = memIo({ "/proj/a.ui.md": spec, "/proj/a.html": "<x>" });
    for (const argv of [
      [],
      ["nope.ui.md", "--url", "u"],
      ["a.ui.md"],
      ["a.ui.md", "--url", "u", "--html", "a.html"],
      ["a.ui.md", "--html", "a.html", "--min-fidelity", "7"],
      ["a.ui.md", "--html", "a.html", "--name-match", "x"],
      ["a.ui.md", "--html", "a.html", "--baseline", "none.json"],
      ["a.ui.md", "--html", "a.html", "--write-baseline"],
    ])
      await expect(run(argv, m.io, good)).rejects.toThrow();
  });
});
