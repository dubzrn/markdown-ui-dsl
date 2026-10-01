import { posix } from "node:path";
import { analyze, parse, type Diagnostic, type Severity } from "@mdui/core";
import { lint } from "@mdui/lint";
import { parseArgs, UsageError, type Args } from "./args.js";
import { ConfigError, loadConfig, type Config, type FailOn } from "./config.js";
import { expand } from "./glob.js";
import type { Io } from "./io.js";

export const VERSION = "0.0.0";

/** Exit-code contract (SPEC §3): 0 ok · 1 diagnostics at/above --fail-on · 2 usage/config error · 3 internal error. */
export const EXIT = { ok: 0, diagnostics: 1, usage: 2, internal: 3 } as const;

const HELP = `mdui ${VERSION} — Markdown UI DSL toolkit

Usage: mdui <command> [options] <files|dirs|globs...>

Commands:
  validate   Parse and analyse; report syntax and semantic diagnostics
  lint       Validate plus the rule catalogue (see mdui.config.json "rules")
  ast        Print the JSON AST of one file

Options:
  --json             Machine-readable output (see packages/cli/README.md)
  --fail-on <level>  error (default) | warn | info | none
  --config <path>    Config file (default: ./mdui.config.json)
  --compact          ast: single-line JSON
  -h, --help         Show this help
  -v, --version      Show the version

Exit codes: 0 ok · 1 diagnostics at/above --fail-on · 2 usage/config error · 3 internal error
`;

const RANK: Record<Severity, number> = { info: 0, warn: 1, error: 2 };

function failsOn(d: Diagnostic, level: FailOn): boolean {
  return level !== "none" && RANK[d.severity] >= RANK[level];
}

interface FileReport {
  file: string;
  diagnostics: Diagnostic[];
}

const view = (d: Diagnostic) => ({
  code: d.code,
  severity: d.severity,
  message: d.message,
  ...(d.rule !== undefined ? { rule: d.rule } : {}),
  line: d.span.start.line,
  col: d.span.start.col,
  endLine: d.span.end.line,
  endCol: d.span.end.col,
});

function report(io: Io, command: string, reports: FileReport[], json: boolean): void {
  const all = reports.flatMap((r) => r.diagnostics);
  const count = (s: Severity): number => all.filter((d) => d.severity === s).length;
  if (json) {
    io.stdout(
      JSON.stringify({
        tool: "mdui",
        version: 1,
        command,
        files: reports.map((r) => ({ file: r.file, diagnostics: r.diagnostics.map(view) })),
        summary: {
          files: reports.length,
          errors: count("error"),
          warnings: count("warn"),
          infos: count("info"),
        },
      }) + "\n",
    );
    return;
  }
  for (const r of reports)
    for (const d of r.diagnostics)
      io.stdout(
        `${r.file}:${d.span.start.line}:${d.span.start.col} ${d.severity} ${d.code} ${d.message}${d.rule !== undefined ? ` [${d.rule}]` : ""}\n`,
      );
  io.stdout(
    `${reports.length} file(s), ${count("error")} error(s), ${count("warn")} warning(s), ${count("info")} info\n`,
  );
}

function readSource(io: Io, root: string, file: string): string | undefined {
  return io.readFile(posix.resolve(io.cwd, file)) ?? io.readFile(posix.resolve(root, file));
}

function run(io: Io, args: Args, cfg: Config): number {
  const cmd = args.command as string;
  const root = posix.resolve(io.cwd, cfg.root);
  const failOn = (args.flags.failOn ?? cfg.failOn) as FailOn;
  if (!["error", "warn", "info", "none"].includes(failOn))
    throw new UsageError("--fail-on must be error|warn|info|none");
  const { files, missing } = expand(io, args.positional);
  if (args.positional.length === 0) throw new UsageError(`${cmd}: no input files`);
  if (missing.length > 0) throw new UsageError(`no such file or no matches: ${missing.join(", ")}`);

  const readFile = (p: string): string | undefined => io.readFile(posix.resolve(root, p));
  const rel = (f: string): string => posix.relative(root, posix.resolve(io.cwd, f));

  if (cmd === "ast") {
    if (files.length !== 1) throw new UsageError("ast takes exactly one file");
    const file = files[0] as string;
    const doc = parse(readSource(io, root, file) as string);
    const a = analyze(doc, { file: rel(file), readFile });
    const out = { ...doc, diagnostics: [...doc.diagnostics, ...a.diagnostics] };
    io.stdout(JSON.stringify(out, null, args.flags.compact ? undefined : 2) + "\n");
    return out.diagnostics.some((d) => failsOn(d, failOn)) ? EXIT.diagnostics : EXIT.ok;
  }

  const reports: FileReport[] = files.map((file) => {
    const src = readSource(io, root, file) as string;
    if (cmd === "lint")
      return {
        file,
        diagnostics: lint(src, { file: rel(file), readFile, config: { rules: cfg.rules } })
          .diagnostics,
      };
    const doc = parse(src);
    const a = analyze(doc, { file: rel(file), readFile });
    return {
      file,
      diagnostics: [...doc.diagnostics, ...a.diagnostics].sort(
        (x, y) => x.span.start.offset - y.span.start.offset,
      ),
    };
  });
  report(io, cmd, reports, args.flags.json);
  return reports.some((r) => r.diagnostics.some((d) => failsOn(d, failOn)))
    ? EXIT.diagnostics
    : EXIT.ok;
}

const COMMANDS = ["validate", "lint", "ast"];

/** CLI entry. Never throws; returns the process exit code. */
export function main(argv: string[], io: Io): number {
  try {
    const args = parseArgs(argv);
    if (args.flags.version) {
      io.stdout(`${VERSION}\n`);
      return EXIT.ok;
    }
    if (args.flags.help || args.command === undefined) {
      io.stdout(HELP);
      return args.command === undefined && !args.flags.help ? EXIT.usage : EXIT.ok;
    }
    if (!COMMANDS.includes(args.command)) throw new UsageError(`unknown command "${args.command}"`);
    return run(io, args, loadConfig(io, args.flags.config));
  } catch (e) {
    if (e instanceof UsageError || e instanceof ConfigError) {
      io.stderr(`mdui: ${e.message}\n`);
      return EXIT.usage;
    }
    io.stderr(`mdui: internal error: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}\n`);
    return EXIT.internal;
  }
}
