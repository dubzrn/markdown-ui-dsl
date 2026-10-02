import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = new URL("../", import.meta.url).pathname;
const conf = join(root, "packages/spec/conformance");
const manifest = JSON.parse(readFileSync(join(conf, "manifest.json"), "utf8")) as {
  version: string;
  protocol: number;
  fixtures: number;
  files: { path: string; suite: string; fixtures: number; sha256: string }[];
};
const python = spawnSync("python3", ["--version"]).status === 0;

describe("conformance bundle (T-083)", () => {
  it("has at least 250 fixtures covering v2, all four suites, and unique ids per file", () => {
    expect(manifest.fixtures).toBeGreaterThanOrEqual(250);
    expect(new Set(manifest.files.map((f) => f.suite))).toEqual(
      new Set(["block", "inline", "frontmatter", "semantic"]),
    );
    expect(
      manifest.files.filter((f) => f.path.startsWith("v2/")).reduce((n, f) => n + f.fixtures, 0),
    ).toBeGreaterThanOrEqual(150);
  });
  it("the manifest matches the files (counts and sha-256)", () => {
    for (const f of manifest.files) {
      const text = readFileSync(join(conf, f.path), "utf8");
      expect(createHash("sha256").update(text).digest("hex"), f.path).toBe(f.sha256);
      expect((JSON.parse(text) as unknown[]).length, f.path).toBe(f.fixtures);
    }
  });
  it("is versioned with @vrillabs/mdui-spec and shipped in its package files", () => {
    const pkg = JSON.parse(readFileSync(join(root, "packages/spec/package.json"), "utf8")) as {
      version: string;
      files: string[];
    };
    expect(manifest.version).toBe(pkg.version);
    expect(pkg.files).toContain("conformance");
  });
  it.skipIf(!python)(
    "the Python runner passes the frontmatter and semantic suites against the reference implementation (the whole bundle runs as its own CI step)",
    () => {
      const n = manifest.files
        .filter((f) => ["frontmatter", "semantic"].includes(f.suite))
        .reduce((a, f) => a + f.fixtures, 0);
      expect(n).toBeGreaterThan(100);
      for (const suite of ["frontmatter", "semantic"]) {
        const r = spawnSync(
          "python3",
          [
            join(conf, "runners/run.py"),
            "--suite",
            suite,
            "--",
            "node",
            join(root, "scripts/conformance-harness.mjs"),
          ],
          { encoding: "utf8" },
        );
        expect(r.status, r.stdout).toBe(0);
      }
    },
  );
  it.skipIf(!python)(
    "the runner fails an implementation that is wrong or crashes (it is not vacuous)",
    () => {
      const dir = mkdtempSync(join(tmpdir(), "conf-"));
      const bad = join(dir, "bad.mjs");
      writeFileSync(
        bad,
        'let s="";for await(const c of process.stdin)s+=c;process.stdout.write(JSON.stringify({diagnostics:[],outline:"",inline:[],issues:[],data:{},parseDiagnostics:[]}));',
      );
      const r = spawnSync(
        "python3",
        [join(conf, "runners/run.py"), "--suite", "frontmatter", "--", "node", bad],
        { encoding: "utf8" },
      );
      expect(r.status).toBe(1);
      expect(r.stdout).toMatch(/FAIL /);
      const crash = join(dir, "crash.mjs");
      writeFileSync(crash, "process.exit(3);");
      expect(
        spawnSync(
          "python3",
          [join(conf, "runners/run.py"), "--suite", "frontmatter", "--", "node", crash],
          { encoding: "utf8" },
        ).status,
      ).toBe(1);
    },
  );
});

describe("shipped spec assets resolve through the package exports (review finding)", () => {
  it("grammar, schema and conformance subpaths are exported", () => {
    const pkg = JSON.parse(readFileSync(join(root, "packages/spec/package.json"), "utf8")) as {
      exports: Record<string, unknown>;
    };
    for (const k of ["./grammar/*", "./schema/*", "./conformance/*"])
      expect(pkg.exports, k).toHaveProperty([k]);
  });
});
