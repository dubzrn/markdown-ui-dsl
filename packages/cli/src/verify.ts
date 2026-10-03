import { posix } from "node:path";
import { parse } from "@vrillabs/mdui-core";
import {
  expectedTree,
  formatReport,
  judge,
  match,
  parseAriaSnapshot,
  parseBaseline,
  toBaseline,
  verifyConstraints,
  readBoxes,
  type Actual,
  type Box,
} from "@vrillabs/mdui-oracle";
import { UsageError, type Args } from "./args.js";
import type { Io } from "./io.js";

const EXIT = { ok: 0, diagnostics: 1, usage: 2, internal: 3 } as const;

/** What a driver returns for a page: its ARIA snapshot and the sizes of its interactive elements. */
export interface PageRead {
  actual: Actual[];
  boxes: Box[];
}
export type Driver = (
  target: { url?: string; html?: string },
  chromium: string | undefined,
) => Promise<PageRead>;

/** Real driver: Playwright (optional peer dependency) + Chromium. */
export const playwrightDriver: Driver = async (target, chromium) => {
  let pw: {
    chromium: {
      launch(o?: object): Promise<{ newPage(): Promise<unknown>; close(): Promise<void> }>;
    };
  };
  try {
    pw = (await import("playwright-core")) as unknown as typeof pw;
  } catch {
    throw new UsageError(
      "verify needs the optional dependency `playwright-core` (npm i -D playwright-core) and a Chromium browser",
    );
  }
  const exe = chromium ?? process.env["CHROMIUM_PATH"];
  const browser = await pw.chromium.launch(exe !== undefined ? { executablePath: exe } : {});
  try {
    const page = (await browser.newPage()) as {
      goto(u: string): Promise<unknown>;
      setContent(h: string): Promise<void>;
      locator(s: string): { ariaSnapshot(): Promise<string> };
      evaluate(e: string): Promise<unknown>;
    };
    if (target.url !== undefined) await page.goto(target.url);
    else await page.setContent(target.html ?? "");
    return {
      actual: parseAriaSnapshot(await page.locator("body").ariaSnapshot()),
      boxes: await readBoxes(page),
    };
  } finally {
    await browser.close();
  }
};

/** `mdui verify <spec> --url U | --html file`: Fidelity Score and post-code constraint checks (T-077, T-078, T-080). */
export async function runVerify(
  io: Io,
  args: Args,
  driver: Driver = playwrightDriver,
): Promise<number> {
  const specArg = args.positional[0];
  if (specArg === undefined)
    throw new UsageError("verify <spec.ui.md> --url <url> | --html <file>");
  const spec = io.readFile(posix.resolve(io.cwd, specArg));
  if (spec === undefined) throw new UsageError(`no such file: ${specArg}`);
  if ((args.flags.url === undefined) === (args.flags.html === undefined))
    throw new UsageError("give exactly one of --url or --html");
  let html: string | undefined;
  if (args.flags.html !== undefined) {
    html = io.readFile(posix.resolve(io.cwd, args.flags.html));
    if (html === undefined) throw new UsageError(`no such file: ${args.flags.html}`);
  }
  const nameMatch = args.flags.nameMatch ?? "exact";
  if (nameMatch !== "exact" && nameMatch !== "loose")
    throw new UsageError("--name-match must be exact|loose");
  let min: number | undefined;
  if (args.flags.minFidelity !== undefined) {
    min = Number(args.flags.minFidelity);
    if (!(min >= 0 && min <= 1))
      throw new UsageError("--min-fidelity must be a number from 0 to 1");
  }
  const baselinePath =
    args.flags.baseline !== undefined ? posix.resolve(io.cwd, args.flags.baseline) : undefined;
  let baseline;
  if (baselinePath !== undefined && !args.flags.writeBaseline) {
    const text = io.readFile(baselinePath);
    if (text === undefined)
      throw new UsageError(
        `no such baseline: ${args.flags.baseline} (create it with --write-baseline)`,
      );
    baseline = parseBaseline(text);
    if (baseline === undefined)
      throw new UsageError(`${args.flags.baseline} is not a valid baseline file`);
  }
  if (args.flags.writeBaseline && baselinePath === undefined)
    throw new UsageError("--write-baseline needs --baseline <file>");

  const doc = parse(spec);
  const read = await driver(
    html !== undefined ? { html } : { url: args.flags.url as string },
    args.flags.chromium,
  );
  const report = match(
    expectedTree(doc, args.flags.state !== undefined ? { state: args.flags.state } : {}),
    read.actual,
    {
      mode: args.flags.strict ? "strict" : "subset",
      nameMatch,
    },
  );
  const declared = doc.meta["constraints"];
  const post =
    declared !== null && typeof declared === "object" && !Array.isArray(declared)
      ? verifyConstraints(spec, read.actual, {
          constraints: declared as Record<string, unknown>,
          boxes: read.boxes,
        })
      : [];

  if (args.flags.writeBaseline && baselinePath !== undefined) {
    io.writeFile(baselinePath, JSON.stringify(toBaseline(report), null, 2) + "\n");
    io.stdout(
      `wrote baseline ${args.flags.baseline} (fidelity ${(report.fidelity * 100).toFixed(1)}%)\n`,
    );
    return EXIT.ok;
  }
  const verdict = judge(report, {
    ...(min !== undefined ? { minFidelity: min } : {}),
    ...(baseline !== undefined ? { baseline } : {}),
  });
  if (args.flags.json)
    io.stdout(
      JSON.stringify({
        tool: "mdui",
        version: 1,
        command: "verify",
        spec: specArg,
        fidelity: report.fidelity,
        mode: report.mode,
        verdicts: report.verdicts
          .filter((v) => v.verdict !== "present")
          .map((v) => ({
            verdict: v.verdict,
            role: v.expected.role,
            name: v.expected.name,
            line: v.expected.line,
            ...(v.actual !== undefined ? { found: v.actual } : {}),
          })),
        extra: report.mode === "strict" ? report.extra : [],
        constraints: post,
        ok: verdict.ok && post.length === 0,
        reasons: verdict.reasons,
      }) + "\n",
    );
  else {
    io.stdout(formatReport(report, specArg));
    for (const p of post)
      io.stdout(`${specArg}:${p.line} constraint ${p.constraint}: ${p.message}\n`);
    for (const r of verdict.reasons) io.stdout(`FAIL ${r}\n`);
  }
  return verdict.ok && post.length === 0 ? EXIT.ok : EXIT.diagnostics;
}
