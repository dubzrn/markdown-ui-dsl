// Adapter for packages/spec/conformance/runners/run.py: stdin document -> JSON on stdout. Requires `pnpm build`.
import { parse, outline } from "../packages/core/dist/index.js";

let src = "";
for await (const chunk of process.stdin) src += chunk;
const doc = parse(src);
process.stdout.write(
  JSON.stringify({
    diagnostics: doc.diagnostics.map((d) => ({ code: d.code, line: d.span.start.line })),
    outline: outline(doc),
  }),
);
