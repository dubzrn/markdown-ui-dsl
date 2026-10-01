// Adapter for packages/spec/conformance/runners/run.py (runner protocol v1): one JSON request on stdin, one JSON answer on stdout.
//   request: { "suite": "block|inline|frontmatter|semantic", "input": "...", "v2": bool, "file": "...", "files": {...} }
// Requires `pnpm build`. Any implementation of the DSL can provide the same adapter in its own language.
import {
  analyze,
  outline,
  parse,
  parseFrontmatter,
  parseInline,
} from "../packages/core/dist/index.js";

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
const req = JSON.parse(raw);
const pos = (d) => ({ code: d.code, line: d.span.start.line });
let out;
switch (req.suite) {
  case "block": {
    const doc = parse(req.input);
    out = { diagnostics: doc.diagnostics.map(pos), outline: outline(doc) };
    break;
  }
  case "inline": {
    const issues = [];
    const inline = req.v2 ? parseInline(req.input, { v2: true, issues }) : parseInline(req.input);
    out = { inline, issues: issues.map((i) => i.code) };
    break;
  }
  case "frontmatter": {
    const r = parseFrontmatter(req.input);
    out = { data: r.data, issues: r.issues.map((i) => ({ code: i.code, line: i.line })) };
    break;
  }
  case "semantic": {
    const doc = parse(req.input);
    const files = req.files;
    const a = analyze(doc, {
      ...(req.file !== undefined ? { file: req.file } : {}),
      ...(files !== undefined ? { readFile: (p) => files[p] } : {}),
    });
    out = {
      parseDiagnostics: doc.diagnostics.map((d) => d.code),
      diagnostics: a.diagnostics.map(pos),
    };
    break;
  }
  default:
    throw new Error(`unknown suite ${req.suite}`);
}
process.stdout.write(JSON.stringify(out));
