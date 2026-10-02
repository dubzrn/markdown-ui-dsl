#!/usr/bin/env node
// Generates the example SVGs shown in docs/EMBED.md from the shipped examples (T-094). `--check` fails when they are stale.
import { readFileSync, writeFileSync } from "node:fs";
import { parse } from "../packages/core/dist/index.js";
import { renderSvg } from "../packages/embed/dist/index.js";

const check = process.argv.includes("--check");
const out = [
  [
    "examples/login-form.ui.md",
    "docs/img/login-form-clean.svg",
    { style: "clean", theme: "light" },
  ],
  [
    "examples/login-form.ui.md",
    "docs/img/login-form-sketch.svg",
    { style: "sketch", theme: "light" },
  ],
  [
    "examples/user-profile.ui.md",
    "docs/img/user-profile-wireframe.svg",
    { style: "wireframe", theme: "light" },
  ],
];
let stale = 0;
for (const [src, dest, o] of out) {
  const svg = renderSvg(parse(readFileSync(new URL(`../${src}`, import.meta.url), "utf8")), o);
  const url = new URL(`../${dest}`, import.meta.url);
  if (check) {
    const old = readFileSync(url, "utf8").toString();
    if (old !== svg) {
      console.error(`${dest} is stale (run node scripts/gen-embed-docs.mjs)`);
      stale++;
    }
  } else writeFileSync(url, svg);
}
if (check) {
  if (stale > 0) process.exit(1);
  console.log(`${out.length} embed example SVGs up to date`);
}
