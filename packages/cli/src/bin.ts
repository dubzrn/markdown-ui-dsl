#!/usr/bin/env node
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { main, EXIT } from "./main.js";
import { parseArgs, UsageError } from "./args.js";
import { runVerify } from "./verify.js";
import { runPreview } from "./preview.js";
import type { Io } from "./io.js";

// `mdui … | head` closes the pipe early: that is not an error.
for (const stream of [process.stdout, process.stderr])
  stream.on("error", (e: NodeJS.ErrnoException) => {
    if (e.code === "EPIPE") process.exit(process.exitCode ?? 0);
    throw e;
  });

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
  removeFile: (p) => rmSync(p, { force: true }),
  realpath: (p) => {
    try {
      return realpathSync(p).replace(/\\/g, "/");
    } catch {
      return undefined;
    }
  },
};

// `verify` drives a browser, so it is async and handled here; everything else is synchronous.
if (process.argv[2] === "verify") {
  try {
    process.exitCode = await runVerify(io, parseArgs(process.argv.slice(2)));
  } catch (e) {
    process.stderr.write(`mdui: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = e instanceof UsageError ? EXIT.usage : EXIT.internal;
  }
} else if (process.argv[2] === "preview") {
  try {
    process.exitCode = await runPreview(io, parseArgs(process.argv.slice(2)));
  } catch (e) {
    process.stderr.write(`mdui: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = e instanceof UsageError ? EXIT.usage : EXIT.internal;
  }
} else process.exitCode = main(process.argv.slice(2), io);
