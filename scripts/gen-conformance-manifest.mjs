// Generates packages/spec/conformance/manifest.json: the versioned, hashed index of the conformance bundle (T-083).
// `--check` fails when the committed file is stale. The bundle version is the @mdui/spec version plus the grammar versions it matches.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const dir = new URL("../packages/spec/conformance/", import.meta.url);
const SUITE = {
  "valid.json": "block",
  "invalid.json": "block",
  "block-valid.json": "block",
  "block-invalid.json": "block",
  "inline.json": "inline",
  "frontmatter.json": "frontmatter",
  "semantic.json": "semantic",
};
const files = [];
for (const v of ["v1", "v2"])
  for (const f of readdirSync(new URL(`${v}/`, dir)).sort()) {
    const text = readFileSync(new URL(`${v}/${f}`, dir), "utf8");
    const suite =
      SUITE[f] ??
      (() => {
        throw new Error(`no suite for ${v}/${f}`);
      })();
    const fx = JSON.parse(text);
    if (new Set(fx.map((x) => x.id)).size !== fx.length)
      throw new Error(`${v}/${f}: duplicate fixture ids`);
    files.push({
      path: `${v}/${f}`,
      suite,
      since: v === "v1" ? "1.0" : "2.0",
      fixtures: fx.length,
      sha256: createHash("sha256").update(text).digest("hex"),
    });
  }
const pkg = JSON.parse(
  readFileSync(new URL("../packages/spec/package.json", import.meta.url), "utf8"),
);
const manifest = {
  version: pkg.version,
  protocol: 1,
  grammars: { v1: "1.0.3", v2: "2.0 (RFC-0001)" },
  fixtures: files.reduce((n, f) => n + f.fixtures, 0),
  files,
};
const text = JSON.stringify(manifest, null, 2) + "\n";
const target = new URL("manifest.json", dir);
if (process.argv.includes("--check")) {
  let cur = "";
  try {
    cur = readFileSync(target, "utf8");
  } catch {
    /* missing */
  }
  if (cur !== text) {
    console.error(
      "packages/spec/conformance/manifest.json is stale: run node scripts/gen-conformance-manifest.mjs",
    );
    process.exit(1);
  }
  console.log(`conformance manifest up to date (${manifest.fixtures} fixtures)`);
} else {
  writeFileSync(target, text);
  console.log(`wrote manifest: ${manifest.fixtures} fixtures in ${files.length} files`);
}
