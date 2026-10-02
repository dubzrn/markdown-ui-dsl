#!/usr/bin/env node
// Clean-room install check (T-098): pack every publishable package, install the tarballs into an empty directory with npm, and
// run the CLI and the MCP server from there. Nothing from the repository checkout is on the path. Exit 1 on any failure.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const pack = mkdtempSync(join(tmpdir(), "mdui-pack-"));
const dir = mkdtempSync(join(tmpdir(), "mdui-clean-"));
const problems = [];
const must = (ok, msg) => ok || problems.push(msg);

try {
  const pkgs = readdirSync(join(root, "packages")).filter((p) => {
    const j = JSON.parse(readFileSync(join(root, "packages", p, "package.json"), "utf8"));
    return j.private !== true;
  });
  for (const p of pkgs)
    execFileSync("pnpm", ["pack", "--pack-destination", pack], {
      cwd: join(root, "packages", p),
      stdio: "pipe",
    });
  const tarballs = readdirSync(pack)
    .filter((f) => f.endsWith(".tgz"))
    .map((f) => join(pack, f));
  must(
    tarballs.length === pkgs.length,
    `packed ${tarballs.length} tarballs for ${pkgs.length} packages`,
  );

  execFileSync("npm", ["init", "-y"], { cwd: dir, stdio: "pipe" });
  execFileSync("npm", ["install", "--no-audit", "--no-fund", ...tarballs], {
    cwd: dir,
    stdio: "pipe",
  });

  const bin = (name) => join(dir, "node_modules", ".bin", name);
  const version = JSON.parse(readFileSync(join(root, "packages/cli/package.json"), "utf8")).version;
  const v = spawnSync(bin("mdui"), ["--version"], { cwd: dir, encoding: "utf8" });
  must(
    v.stdout.trim() === version,
    `mdui --version printed "${v.stdout.trim()}", expected ${version}`,
  );

  writeFileSync(join(dir, "a.ui.md"), "::: CARD :::\n# Hi\n[ Go ](#go)\n--- END ---\n");
  const l = spawnSync(bin("mdui"), ["lint", "a.ui.md"], { cwd: dir, encoding: "utf8" });
  must(l.status === 0 && /0 error/.test(l.stdout), `mdui lint failed: ${l.stdout}${l.stderr}`);
  must(
    spawnSync(bin("mdui"), ["svg", "a.ui.md"], { cwd: dir, encoding: "utf8" }).stdout.startsWith(
      "<svg",
    ),
    "mdui svg did not print an SVG",
  );
  must(
    spawnSync(bin("mdui"), ["export", "a.ui.md", "--to", "a2ui"], {
      cwd: dir,
      encoding: "utf8",
    }).stdout.includes("createSurface"),
    "mdui export did not print A2UI",
  );

  const init = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "clean-room", version: "0" },
    },
  });
  const m = spawnSync(bin("mdui-mcp"), [], {
    cwd: dir,
    input: `${init}\n`,
    encoding: "utf8",
    timeout: 10_000,
  });
  must(
    m.stdout.includes('"serverInfo"') && m.stdout.includes(`"version":"${version}"`),
    `mdui-mcp did not answer initialize: ${m.stdout}${m.stderr}`,
  );

  for (const p of pkgs) {
    const d = join(dir, "node_modules", "@vrillabs", `mdui-${p}`);
    must(
      existsSync(join(d, "LICENSE")) && existsSync(join(d, "NOTICE")),
      `${p}: LICENSE/NOTICE missing from the tarball`,
    );
  }
} catch (e) {
  problems.push(String(e.stderr ?? e.message ?? e));
} finally {
  rmSync(pack, { recursive: true, force: true });
  rmSync(dir, { recursive: true, force: true });
}
if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(
  "clean-room install: CLI and MCP server run from the packed tarballs; LICENSE and NOTICE ship in every package",
);
