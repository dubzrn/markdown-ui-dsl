/** `sync plan` (T-074a): read-only. Merges spec units, code units and the lock into one classified entry per anchor. */
import { assignAnchors, type AnchoredUnit } from "./anchors.js";
import { classify, diffItems, type Action, type ItemOp, type SyncClass } from "./classify.js";
import { extractHtml, extractTsx, type CodeUnit } from "./code.js";
import type { Item, Role } from "./fingerprint.js";
import { parseLock, type Lock } from "./lock.js";
import { specUnits } from "./spec.js";

export interface PlanInput {
  specPath: string;
  specSource: string;
  lockText?: string | undefined;
  code: { path: string; source: string }[];
  components?: Record<string, Role>;
}

export interface PlanEntry {
  anchor: string;
  kind: string;
  class: SyncClass;
  action: Action;
  spec?: { line: number; items: Item[] };
  code?: { path: string; line: number; items: Item[] };
  /** Edit script turning the code unit into the spec unit (what an agent does for `patch-code`). */
  toCode?: ItemOp[];
  /** Edit script turning the spec unit into the code unit (what `apply` does for `patch-spec`). */
  toSpec?: ItemOp[];
}

export interface Plan {
  version: 1;
  spec: string;
  entries: PlanEntry[];
  summary: Record<SyncClass, number>;
  /** Anchors in the lock that exist on neither side any more (dropped by apply). */
  gone: string[];
  unmapped: { path: string; tag: string; line: number }[];
  problems: string[];
}

export interface Analysis {
  plan: Plan;
  lock: Lock | undefined;
  units: AnchoredUnit[];
  codeUnits: Map<string, CodeUnit>;
}

const ordered = (items: readonly Item[]): Item[] => items.map((i) => ({ ...i }));

export function analyse(input: PlanInput): Analysis {
  const problems: string[] = [];
  let lock: Lock | undefined;
  if (input.lockText !== undefined) {
    const r = parseLock(input.lockText);
    lock = r.lock;
    problems.push(...r.problems);
  }
  const { units: raw } = specUnits(input.specSource);
  const anchored = assignAnchors(raw, lock);
  for (const p of anchored.problems) problems.push(p.message);
  const specBy = new Map<string, AnchoredUnit>();
  for (const u of anchored.units) {
    if (u.anchor === "page" && u.items.length === 0) continue;
    specBy.set(u.anchor, u);
  }

  const codeBy = new Map<string, CodeUnit>();
  const unmapped: Plan["unmapped"] = [];
  for (const f of input.code) {
    const ex = /\.(html?|vue|svelte)$/i.test(f.path)
      ? extractHtml(f.source, f.path, input.components)
      : extractTsx(
          f.source,
          f.path,
          input.components !== undefined ? { components: input.components } : {},
        );
    problems.push(...ex.problems);
    for (const u of ex.units) {
      if (codeBy.has(u.anchor))
        problems.push(
          `anchor "${u.anchor}" is in ${codeBy.get(u.anchor)?.path} and ${f.path}; the first is used`,
        );
      else codeBy.set(u.anchor, u);
    }
    for (const x of ex.unmapped) unmapped.push({ path: f.path, ...x });
  }

  const names = new Set<string>([
    ...specBy.keys(),
    ...codeBy.keys(),
    ...Object.keys(lock?.anchors ?? {}),
  ]);
  const specOrder = [...specBy.keys()];
  const sorted = [...names].sort((a, b) => {
    const ia = specOrder.indexOf(a);
    const ib = specOrder.indexOf(b);
    return (ia === -1 ? 1e9 : ia) - (ib === -1 ? 1e9 : ib) || (a < b ? -1 : 1);
  });
  const entries: PlanEntry[] = [];
  const gone: string[] = [];
  const summary: Plan["summary"] = {
    clean: 0,
    "spec-ahead": 0,
    "code-ahead": 0,
    converged: 0,
    conflict: 0,
    "orphan-spec": 0,
    "orphan-code": 0,
  };
  for (const anchor of sorted) {
    const s = specBy.get(anchor);
    const c = codeBy.get(anchor);
    const base =
      lock !== undefined && Object.hasOwn(lock.anchors, anchor) ? lock.anchors[anchor] : undefined;
    const r = classify(base, s?.items, c?.items);
    if (r.cls === "gone") {
      gone.push(anchor);
      continue;
    }
    summary[r.cls]++;
    const e: PlanEntry = {
      anchor,
      kind: s?.kind ?? base?.kind ?? "unit",
      class: r.cls,
      action: r.action,
    };
    if (s !== undefined) e.spec = { line: s.span?.start.line ?? 1, items: ordered(s.items) };
    if (c !== undefined) e.code = { path: c.path, line: c.line, items: ordered(c.items) };
    if (s !== undefined && c !== undefined && r.cls !== "clean") {
      e.toCode = diffItems(c.items, s.items);
      e.toSpec = diffItems(s.items, c.items);
    }
    entries.push(e);
  }
  const plan: Plan = {
    version: 1,
    spec: input.specPath,
    entries,
    summary,
    gone,
    unmapped,
    problems,
  };
  return { plan, lock, units: anchored.units, codeUnits: codeBy };
}

export const plan = (input: PlanInput): Plan => analyse(input).plan;

/** One line per anchor, in the shape of the feature spec's example. */
export function formatPlan(p: Plan): string {
  const lines = p.entries.map((e) => {
    const where =
      e.code !== undefined ? ` ${e.action === "patch-spec" ? "<-" : "->"} ${e.code.path}` : "";
    return `${e.anchor.padEnd(18)} ${e.class.padEnd(12)} ${e.action}${where}`;
  });
  const sum = Object.entries(p.summary)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${k}`)
    .join(", ");
  for (const g of p.gone) lines.push(`${g.padEnd(18)} gone         drop from lock`);
  for (const x of p.problems) lines.push(`problem: ${x}`);
  for (const u of p.unmapped)
    lines.push(`unmapped: <${u.tag}> at ${u.path}:${u.line} is outside every anchor`);
  return `${lines.join("\n")}${lines.length > 0 ? "\n" : ""}${sum === "" ? "no units" : sum}\n`;
}
