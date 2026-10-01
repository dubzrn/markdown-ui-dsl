#!/usr/bin/env node
import { createInterface } from "node:readline";
import { handleLine } from "./server.js";

/** A line longer than this is refused without parsing it. */
const MAX_LINE = 8_000_000;

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", (line) => {
  const out =
    line.length > MAX_LINE
      ? JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32600, message: "Request too large" },
        })
      : handleLine(line);
  if (out !== undefined) process.stdout.write(out + "\n");
});
process.stdout.on("error", (e: NodeJS.ErrnoException) => {
  if (e.code === "EPIPE") process.exit(0);
  throw e;
});
process.stderr.write("mdui-mcp ready (stdio)\n");
