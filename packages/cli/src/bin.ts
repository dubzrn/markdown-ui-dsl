#!/usr/bin/env node
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { main } from "./main.js";
import type { Io } from "./io.js";

const io: Io = {
  cwd: process.cwd().replace(/\\/g, "/"),
  stdout: (s) => void process.stdout.write(s),
  stderr: (s) => void process.stderr.write(s),
  readFile: (p) => {
    try {
      return readFileSync(p, "utf8");
    } catch {
      return undefined;
    }
  },
  readDir: (p) => {
    try {
      if (!statSync(p).isDirectory()) return undefined;
      return readdirSync(p, { withFileTypes: true }).map((e) => ({
        name: e.name,
        isDir: e.isDirectory(),
      }));
    } catch {
      return undefined;
    }
  },
  writeFile: (p, text) => {
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, text);
  },
};

process.exitCode = main(process.argv.slice(2), io);
