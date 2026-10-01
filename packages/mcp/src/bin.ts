#!/usr/bin/env node
import { handleLine } from "./server.js";

/** A request line longer than this is refused without parsing it (and without buffering the rest of it). */
const MAX_LINE = 8_000_000;

const tooLarge = JSON.stringify({
  jsonrpc: "2.0",
  id: null,
  error: { code: -32600, message: "Request too large" },
});

const reply = (out: string | undefined): void => {
  if (out !== undefined) process.stdout.write(out + "\n");
};

// Frame by hand instead of using readline: readline holds a whole line in memory before it emits it, so the cap would
// only apply after an arbitrarily large request is already resident. Here a line is dropped as soon as it passes the cap.
let buf = "";
let discarding = false;
const take = (line: string): void => reply(line.length > MAX_LINE ? tooLarge : handleLine(line));

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk: string) => {
  let rest = chunk;
  while (rest.length > 0) {
    const nl = rest.indexOf("\n");
    if (nl === -1) {
      if (!discarding) {
        buf += rest;
        if (buf.length > MAX_LINE) {
          reply(tooLarge);
          buf = "";
          discarding = true;
        }
      }
      return;
    }
    const part = rest.slice(0, nl);
    rest = rest.slice(nl + 1);
    if (discarding) {
      discarding = false;
      continue;
    }
    take((buf + part).replace(/\r$/, ""));
    buf = "";
  }
});
process.stdin.on("end", () => {
  if (!discarding && buf.trim() !== "") take(buf.replace(/\r$/, ""));
});
process.stdout.on("error", (e: NodeJS.ErrnoException) => {
  if (e.code === "EPIPE") process.exit(0);
  throw e;
});
process.stderr.write("mdui-mcp ready (stdio)\n");
