import { posix } from "node:path";
import { loadMap } from "@vrillabs/mdui-catalog";
import {
  analyse,
  computeApply,
  formatPlan,
  parseLock,
  recover,
  relink,
  serializeLock,
  writeAtomically,
  type Fs,
  type Resolution,
  type Role,
} from "@vrillabs/mdui-sync";
import { UsageError, type Args } from "./args.js";
import { EXIT } from "./main.js";
import { expand } from "./glob.js";
import { realWithin } from "./confine.js";
import type { Io } from "./io.js";

const ROLE_OF_PRIMITIVE: Record<string, Role> = {
  button: "button",
  link: "link",
  input: "textbox",
  checkbox: "checkbox",
  radio: "radio",
  toggle: "switch",
  dropdown: "combobox",
  image: "img",
};

function fsOf(io: Io): Fs {
  return {
    read: (p) => io.readFile(p),
    write: (p, t) => io.writeFile(p, t),
    remove: (p) => io.removeFile(p),
    ...(io.realpath !== undefined ? { realpath: io.realpath } : {}),
  };
}

/** `mdui sync plan|apply|relink|recover` (T-074). Nothing is written except by `apply --confirm` and `relink`. */
export function runSync(io: Io, args: Args, root: string): number {
  const [sub, ...rest] = args.positional;
  if (sub === undefined || !["plan", "apply", "relink", "recover"].includes(sub))
    throw new UsageError("sync needs a subcommand: plan | apply | relink | recover");
  const abs = (f: string): string => posix.resolve(io.cwd, f);
  const lockRel = args.flags.lock ?? posix.join(posix.dirname(rest[0] ?? "."), ".ui.lock");

  if (sub === "recover") {
    const r = recover(fsOf(io), root);
    io.stdout(
      r.restored.length === 0 && r.failed.length === 0
        ? "nothing to recover\n"
        : `restored: ${r.restored.join(", ") || "-"}${r.failed.length > 0 ? `\nFAILED: ${r.failed.join(", ")}` : ""}\n`,
    );
    return r.failed.length > 0 ? EXIT.diagnostics : EXIT.ok;
  }

  if (sub === "relink") {
    const [from, to] = rest;
    if (from === undefined || to === undefined)
      throw new UsageError("sync relink <old-anchor> <new-anchor> [--lock path]");
    const lp = abs(args.flags.lock ?? ".ui.lock");
    const text = io.readFile(lp);
    if (text === undefined) throw new UsageError(`no such file: ${args.flags.lock ?? ".ui.lock"}`);
    const lock = parseLock(text);
    if (lock.lock === undefined) throw new UsageError(lock.problems.join("; "));
    const err = relink(lock.lock, from, to);
    if (err !== undefined) throw new UsageError(err);
    io.writeFile(lp, serializeLock(lock.lock));
    io.stdout(`relinked ${from} -> ${to}\n`);
    return EXIT.ok;
  }

  const specArg = rest[0];
  if (specArg === undefined) throw new UsageError(`sync ${sub} <spec.ui.md> --code <files>`);
  const spec = io.readFile(abs(specArg));
  if (spec === undefined) throw new UsageError(`no such file: ${specArg}`);
  const codeArgs = (args.flags.code ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x !== "");
  if (codeArgs.length === 0) throw new UsageError("--code <files> is required (comma separated)");
  const { files: codeFiles, missing } = expand(io, codeArgs);
  if (missing.length > 0) throw new UsageError(`no such file: ${missing.join(", ")}`);
  for (const path of codeFiles)
    if (!realWithin(io, root, abs(path)))
      throw new UsageError(`${path} is outside the project root (or a symlink that leaves it)`);
  const code = codeFiles.map((path) => ({ path, source: io.readFile(abs(path)) ?? "" }));
  let components: Record<string, Role> | undefined;
  if (args.flags.map !== undefined) {
    const m = io.readFile(abs(args.flags.map));
    if (m === undefined) throw new UsageError(`no such file: ${args.flags.map}`);
    components = {};
    for (const [prim, e] of Object.entries(loadMap(m).map.components)) {
      const role = ROLE_OF_PRIMITIVE[prim.toLowerCase()];
      if (role !== undefined) components[e.component] = role;
    }
  }
  const lockText = io.readFile(abs(lockRel));
  const input = {
    specPath: specArg,
    specSource: spec,
    lockText,
    code,
    ...(components !== undefined ? { components } : {}),
  };

  if (sub === "plan") {
    const { plan: p } = analyse(input);
    if (args.flags.json)
      io.stdout(JSON.stringify({ tool: "mdui", command: "sync plan", ...p }) + "\n");
    else io.stdout(formatPlan(p));
    const drift = p.entries.some((e) => e.class !== "clean") || p.problems.length > 0;
    return args.flags.check && drift ? EXIT.diagnostics : EXIT.ok;
  }

  // apply
  if (!args.flags.confirm)
    throw new UsageError("sync apply changes files: pass --confirm (it is never read from a spec)");
  const fs = fsOf(io);
  const back = recover(fs, root);
  if (back.restored.length > 0)
    io.stderr(`rolled back an interrupted earlier run: ${back.restored.join(", ")}\n`);
  const resolve: Record<string, Resolution> = Object.create(null) as Record<string, Resolution>;
  for (const pair of (args.flags.resolve ?? "").split(",").filter((x) => x !== "")) {
    const [a, c] = pair.split("=");
    if (a === undefined || !["spec", "code", "adopt", "ignore"].includes(c ?? ""))
      throw new UsageError(`--resolve expects anchor=spec|code|adopt|ignore, got "${pair}"`);
    resolve[a] = c as Resolution;
  }
  const r = computeApply(input, { confirm: true, resolve, lockPath: lockRel });
  if (!r.ok) throw new UsageError(r.refused ?? "apply refused");
  const w = writeAtomically(fs, root, r.files);
  if (!w.ok) {
    io.stderr(`mdui: ${w.error ?? "write failed"}\n`);
    return EXIT.internal;
  }
  for (const a of r.applied) io.stdout(`${a.anchor.padEnd(18)} ${a.what}\n`);
  for (const s of r.skipped) io.stdout(`${s.anchor.padEnd(18)} left alone: ${s.reason}\n`);
  io.stdout(`wrote ${w.written.join(", ")}\n`);
  return r.skipped.length > 0 ? EXIT.diagnostics : EXIT.ok;
}
