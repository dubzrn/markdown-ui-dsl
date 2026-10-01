import { posix } from "node:path";
import { analyze, format, parse, type Diagnostic, type Severity } from "@mdui/core";
import { ALL_RULES, fixSource, lint, lintDesignSystem } from "@mdui/lint";
import {
  diffTokens,
  formatTokenDiff,
  loadDesignSystem,
  toCssVars,
  toDtcg,
  toTailwind3,
  toTailwind4,
  validateDtcg,
} from "@mdui/tokens";
import { diffDocuments, formatDiff, migrate } from "@mdui/tools";
import { render } from "@mdui/render";
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
  lint       Validate plus the rule catalogue (see mdui.config.json "rules"); --fix applies safe fixes
  diff       Semantic diff of two files (exit 1 on regressions)
  migrate    v1 → 2.0 (dry run by default; --write applies, --force overrides manual-review items)
  tokens     Design systems: tokens lint|export|diff <DESIGN.md…> (export: --to dtcg|tailwind3|tailwind4|css)
  rules      List the lint rules (--json for machine output)
  ast        Print the JSON AST of one file
  render     Render one file to HTML (--style sketch|clean|wireframe|none, --state, --theme, --out)
  fmt        Canonical formatting (rewrites files; --check only reports)

Options:
  --json             Machine-readable output (see packages/cli/README.md)
  --fail-on <level>  error (default) | warn | info | none
  --config <path>    Config file (default: ./mdui.config.json)
  --compact          ast: single-line JSON
  --to <format>      tokens export: dtcg | tailwind3 | tailwind4 | css
  --write            migrate: write the migrated files
  --force            migrate: write even when manual-review items remain
  --fix              lint: apply fixes in place (overlapping fixes are skipped)
  --check            fmt: do not write; exit 1 if any file would change
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

function listRules(io: Io, json: boolean): number {
  const rows = ALL_RULES.map((r) => ({
    id: r.id,
    category: r.category,
    severity: r.defaultSeverity,
    codes: r.codes,
    wcag: r.wcag ?? [],
    fixable: r.fixable === true,
    description: r.description,
  }));
  if (json)
    io.stdout(JSON.stringify({ tool: "mdui", version: 1, command: "rules", rules: rows }) + "\n");
  else {
    for (const r of rows)
      io.stdout(
        `${r.id.padEnd(30)} ${r.severity.padEnd(6)} ${r.codes.join(",").padEnd(22)} ${r.category}${r.fixable ? " (fixable)" : ""}\n`,
      );
    io.stdout(`${rows.length} rules\n`);
  }
  return EXIT.ok;
}

function runTokens(io: Io, args: Args, cfg: Config): number {
  const [sub, ...rest] = args.positional;
  const failOn = (args.flags.failOn ?? cfg.failOn) as FailOn;
  if (sub === undefined || !["lint", "export", "diff"].includes(sub))
    throw new UsageError("tokens needs a subcommand: lint | export | diff");
  const { files, missing } = expand(io, rest);
  if (rest.length === 0) throw new UsageError(`tokens ${sub}: no input files`);
  if (missing.length > 0) throw new UsageError(`no such file: ${missing.join(", ")}`);
  const read = (f: string): string => io.readFile(posix.resolve(io.cwd, f)) as string;

  if (sub === "lint") {
    const reports = files.map((file) => ({
      file,
      diagnostics: lintDesignSystem(read(file), { config: { rules: cfg.rules } }).diagnostics,
    }));
    report(io, "tokens lint", reports, args.flags.json);
    return reports.some((r) => r.diagnostics.some((d) => failsOn(d, failOn)))
      ? EXIT.diagnostics
      : EXIT.ok;
  }
  if (sub === "export") {
    if (files.length !== 1) throw new UsageError("tokens export takes exactly one file");
    const to = args.flags.to ?? "dtcg";
    if (!["dtcg", "tailwind3", "tailwind4", "css"].includes(to))
      throw new UsageError("--to must be dtcg|tailwind3|tailwind4|css");
    const ds = loadDesignSystem(read(files[0] as string));
    let text: string;
    let warnings: string[];
    if (to === "dtcg") {
      const r = toDtcg(ds);
      const problems = validateDtcg(r.file);
      warnings = [...r.report.warnings, ...problems.map((p) => `invalid DTCG: ${p}`)];
      text = JSON.stringify(r.file, null, 2) + "\n";
    } else if (to === "tailwind3") {
      const r = toTailwind3(ds);
      warnings = r.report.warnings;
      text = JSON.stringify(r.config, null, 2) + "\n";
    } else {
      const r = to === "tailwind4" ? toTailwind4(ds) : toCssVars(ds);
      warnings = r.report.warnings;
      text = r.css;
    }
    if (args.flags.out !== undefined) io.writeFile(posix.resolve(io.cwd, args.flags.out), text);
    else io.stdout(text);
    for (const w of warnings) io.stderr(`warning: ${w}\n`);
    return EXIT.ok;
  }
  if (files.length !== 2) throw new UsageError("tokens diff takes exactly two files");
  const d = diffTokens(
    loadDesignSystem(read(files[0] as string)),
    loadDesignSystem(read(files[1] as string)),
  );
  if (args.flags.json)
    io.stdout(JSON.stringify({ tool: "mdui", version: 1, command: "tokens diff", ...d }) + "\n");
  else io.stdout(formatTokenDiff(d));
  return d.regressions.length > 0 ? EXIT.diagnostics : EXIT.ok;
}

function run(io: Io, args: Args, cfg: Config): number {
  const cmd = args.command as string;
  if (cmd === "rules") return listRules(io, args.flags.json);
  if (cmd === "tokens") return runTokens(io, args, cfg);
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

  if (cmd === "diff") {
    if (files.length !== 2) throw new UsageError("diff takes exactly two files");
    const [fa, fb] = files as [string, string];
    const sa = readSource(io, root, fa) as string;
    const sb = readSource(io, root, fb) as string;
    const result = diffDocuments(parse(sa), parse(sb), { beforeSource: sa, afterSource: sb });
    if (args.flags.json)
      io.stdout(
        JSON.stringify({
          tool: "mdui",
          version: 1,
          command: "diff",
          before: fa,
          after: fb,
          ...result,
        }) + "\n",
      );
    else io.stdout(formatDiff(result));
    return result.regressions.length > 0 ? EXIT.diagnostics : EXIT.ok;
  }

  if (cmd === "migrate") {
    let blocked = 0;
    const out: {
      file: string;
      alreadyV2: boolean;
      changes: unknown[];
      manual: unknown[];
      written: boolean;
    }[] = [];
    for (const file of files) {
      const abs = posix.resolve(io.cwd, file);
      const src = io.readFile(abs) as string;
      const r = migrate(src);
      const canWrite =
        args.flags.write && !r.alreadyV2 && (r.manual.length === 0 || args.flags.force);
      if (canWrite) io.writeFile(abs, r.text);
      if (r.manual.length > 0 && !args.flags.force) blocked++;
      out.push({
        file,
        alreadyV2: r.alreadyV2,
        changes: r.changes,
        manual: r.manual,
        written: canWrite,
      });
      if (!args.flags.json) {
        if (r.alreadyV2) io.stdout(`${file}: already 2.0\n`);
        else {
          for (const c of r.changes)
            io.stdout(
              `${file}:${c.line} ${c.kind}: ${c.before === "" ? "(add)" : c.before} → ${c.after.replace(/\n/g, "⏎")}\n`,
            );
          for (const m of r.manual) io.stdout(`${file}:${m.line} MANUAL: ${m.message}\n`);
          io.stdout(
            `${file}: ${canWrite ? "migrated" : r.manual.length > 0 && !args.flags.force ? "NOT migrated (manual review needed)" : args.flags.write ? "nothing to write" : "dry run"}\n`,
          );
        }
      }
    }
    if (args.flags.json)
      io.stdout(
        JSON.stringify({ tool: "mdui", version: 1, command: "migrate", files: out }) + "\n",
      );
    return blocked > 0 ? EXIT.diagnostics : EXIT.ok;
  }

  if (cmd === "render") {
    if (files.length !== 1) throw new UsageError("render takes exactly one file");
    const style = args.flags.style ?? "clean";
    if (!["sketch", "clean", "wireframe", "none"].includes(style))
      throw new UsageError("--style must be sketch|clean|wireframe|none");
    const theme = args.flags.theme ?? "auto";
    if (!["auto", "light", "dark"].includes(theme))
      throw new UsageError("--theme must be auto|light|dark");
    const file = files[0] as string;
    const doc = parse(readSource(io, root, file) as string);
    const a = analyze(doc, { file: rel(file), readFile });
    const includes = new Map(
      a.includes.flatMap((i) =>
        i.path !== undefined && i.doc !== undefined ? [[i.path, i.doc] as const] : [],
      ),
    );
    const html = render(doc, {
      style: style as "sketch" | "clean" | "wireframe" | "none",
      theme: theme as "auto" | "light" | "dark",
      includes,
      ...(args.flags.state !== undefined ? { state: args.flags.state } : {}),
    });
    if (args.flags.out !== undefined) io.writeFile(posix.resolve(io.cwd, args.flags.out), html);
    else io.stdout(html);
    const diags = [...doc.diagnostics, ...a.diagnostics];
    for (const d of diags)
      io.stderr(
        `${file}:${d.span.start.line}:${d.span.start.col} ${d.severity} ${d.code} ${d.message}\n`,
      );
    return diags.some((d) => failsOn(d, failOn)) ? EXIT.diagnostics : EXIT.ok;
  }

  if (cmd === "fmt") {
    const changed: string[] = [];
    for (const file of files) {
      const abs = posix.resolve(io.cwd, file);
      const src = io.readFile(abs) as string;
      const r = format(src);
      if (r.changed) {
        changed.push(file);
        if (!args.flags.check) io.writeFile(abs, r.text);
      }
    }
    if (args.flags.json)
      io.stdout(
        JSON.stringify({
          tool: "mdui",
          version: 1,
          command: "fmt",
          checked: args.flags.check,
          files: files.length,
          changed,
        }) + "\n",
      );
    else {
      for (const f of changed)
        io.stdout(`${args.flags.check ? "would reformat" : "reformatted"} ${f}\n`);
      io.stdout(
        `${files.length} file(s), ${changed.length} ${args.flags.check ? "need formatting" : "reformatted"}\n`,
      );
    }
    return args.flags.check && changed.length > 0 ? EXIT.diagnostics : EXIT.ok;
  }

  const reports: FileReport[] = files.map((file) => {
    const src = readSource(io, root, file) as string;
    if (cmd === "lint") {
      const opts = { file: rel(file), readFile, config: { rules: cfg.rules } };
      let result = lint(src, opts);
      if (args.flags.fix) {
        const fixed = fixSource(src, opts);
        if (fixed.text !== src.replace(/\r\n/g, "\n")) {
          io.writeFile(posix.resolve(io.cwd, file), fixed.text);
          result = lint(fixed.text, opts);
        }
        for (const rj of fixed.rejected)
          io.stderr(
            `${file}:${rj.line} fix for ${rj.code} skipped: it would not improve the document\n`,
          );
      }
      const unused: Diagnostic[] = result.unusedSuppressions.map((u) => {
        const p = { line: u.line, col: 1, offset: 0 };
        return {
          code: "I1501",
          severity: "info",
          message: `Suppression${u.rules.length > 0 ? ` of ${u.rules.join(", ")}` : ""} matched nothing.`,
          span: { start: p, end: p },
          rule: "unused-suppression",
        };
      });
      return { file, diagnostics: [...result.diagnostics, ...unused] };
    }
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

const COMMANDS = ["validate", "lint", "ast", "fmt", "render", "rules", "diff", "migrate", "tokens"];

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
