/** Matcher and Fidelity Score (T-077b/c). Our own matcher: Playwright's native comparison is order-sensitive only. */
import type { Expected } from "./expected.js";
import type { Actual } from "./snapshot.js";

export type Verdict = "present" | "missing" | "role-mismatch" | "name-mismatch" | "order-mismatch";

export interface NodeVerdict {
  expected: Expected;
  verdict: Verdict;
  /** What was found instead, for the mismatch verdicts. */
  actual?: Actual;
}

export interface MatchOptions {
  mode?: "subset" | "strict";
  /** `exact` (default): names equal after whitespace/case folding. `loose`: one contains the other. */
  nameMatch?: "exact" | "loose";
  /** Spec regions whose children may appear in any order (expected-node indices are not needed: pass lines). */
  unorderedLines?: ReadonlySet<number>;
}

export interface Report {
  verdicts: NodeVerdict[];
  /** Actual nodes that no expected node claimed (reported in strict mode, informational in subset mode). */
  extra: Actual[];
  fidelity: number;
  matchedWeight: number;
  expectedWeight: number;
  mode: "subset" | "strict";
}

const fold = (s: string): string => s.replace(/\s+/g, " ").trim().toLowerCase();
const WRAPPERS = new Set([
  "generic",
  "group",
  "region",
  "main",
  "paragraph",
  "article",
  "section",
  "document",
  "presentation",
  "none",
  "rowgroup",
  "row",
  "cell",
  "gridcell",
  "columnheader",
  "rowheader",
  "listitem",
  "form",
]);
const relevant = (a: Actual): boolean => !WRAPPERS.has(a.role);

function nameOk(e: Expected, a: Actual, loose: boolean): boolean {
  const x = fold(e.name);
  const y = fold(a.name !== "" ? a.name : (a.text ?? ""));
  if (x === y) return true;
  return loose && x !== "" && y !== "" && (x.includes(y) || y.includes(x));
}
const roleOk = (e: Expected, a: Actual): boolean =>
  e.role === a.role ||
  (e.role === "text" && (a.role === "text" || a.role === "paragraph")) ||
  (e.role === "checkbox" && a.role === "switch" && false);

export function match(
  expected: readonly Expected[],
  actualAll: readonly Actual[],
  opts: MatchOptions = {},
): Report {
  const mode = opts.mode ?? "subset";
  const loose = opts.nameMatch === "loose";
  const actual = actualAll.filter(relevant);
  const used = new Array<boolean>(actual.length).fill(false);
  const verdicts: NodeVerdict[] = [];
  let cursor = 0;
  for (const e of expected) {
    const unordered = opts.unorderedLines?.has(e.line) === true;
    if (e.role === "text") {
      // paragraphs are matched by containment (apps wrap and join lines); a paragraph can satisfy several lines
      const want = fold(e.name);
      const holds = (a: Actual): boolean => a.role === "text" && fold(a.name).includes(want);
      let at = -1;
      for (let i = unordered ? 0 : cursor; i < actual.length; i++)
        if (holds(actual[i] as Actual)) {
          at = i;
          break;
        }
      if (at !== -1) {
        if (!unordered) cursor = at;
        verdicts.push({ expected: e, verdict: "present", actual: actual[at] as Actual });
        continue;
      }
      const early = actual.findIndex(holds);
      verdicts.push(
        early !== -1
          ? { expected: e, verdict: "order-mismatch", actual: actual[early] as Actual }
          : { expected: e, verdict: "missing" },
      );
      continue;
    }
    // 1. in order, from the cursor
    let found = -1;
    for (let i = unordered ? 0 : cursor; i < actual.length; i++)
      if (
        !used[i] &&
        roleOk(e, actual[i] as Actual) &&
        (e.role === "banner" ||
          e.role === "contentinfo" ||
          e.role === "dialog" ||
          e.role === "list" ||
          e.role === "table" ||
          e.role === "tablist" ||
          nameOk(e, actual[i] as Actual, loose)) &&
        (e.level === undefined || (actual[i] as Actual).level === e.level)
      ) {
        found = i;
        break;
      }
    if (found !== -1) {
      used[found] = true;
      if (!unordered) cursor = found + 1;
      verdicts.push({ expected: e, verdict: "present", actual: actual[found] as Actual });
      continue;
    }
    // 2. somewhere earlier: present but out of order
    const early = actual.findIndex(
      (a, i) =>
        !used[i] &&
        roleOk(e, a) &&
        nameOk(e, a, loose) &&
        (e.level === undefined || a.level === e.level),
    );
    if (early !== -1) {
      used[early] = true;
      verdicts.push({ expected: e, verdict: "order-mismatch", actual: actual[early] as Actual });
      continue;
    }
    // 3. same name, other role
    const role = actual.findIndex(
      (a, i) => !used[i] && e.name !== "" && nameOk(e, a, loose) && !roleOk(e, a),
    );
    if (role !== -1) {
      used[role] = true;
      verdicts.push({ expected: e, verdict: "role-mismatch", actual: actual[role] as Actual });
      continue;
    }
    // 4. same role, other name (the nearest unclaimed one after the cursor)
    const nm = actual.findIndex((a, i) => !used[i] && roleOk(e, a) && e.role !== "text");
    if (nm !== -1 && e.name !== "") {
      used[nm] = true;
      verdicts.push({ expected: e, verdict: "name-mismatch", actual: actual[nm] as Actual });
      continue;
    }
    verdicts.push({ expected: e, verdict: "missing" });
  }
  const extra = actual.filter((_, i) => !used[i]);
  let matched = 0;
  let total = 0;
  for (const v of verdicts) {
    total += v.expected.weight;
    if (v.verdict === "present") matched += v.expected.weight;
  }
  const strictPenalty = mode === "strict" && extra.length > 0;
  return {
    verdicts,
    extra,
    fidelity:
      total === 0 ? 1 : strictPenalty ? Math.min(matched / total, 0.999999) : matched / total,
    matchedWeight: matched,
    expectedWeight: total,
    mode,
  };
}

export function formatReport(r: Report, spec = "spec"): string {
  const bad = r.verdicts.filter((v) => v.verdict !== "present");
  const lines = bad.map(
    (v) =>
      `${spec}:${v.expected.line} ${v.verdict.padEnd(14)} ${v.expected.role}${v.expected.name !== "" ? ` "${v.expected.name}"` : ""}${v.actual !== undefined ? ` (found ${v.actual.role}${v.actual.name !== "" ? ` "${v.actual.name}"` : ""})` : ""}`,
  );
  if (r.mode === "strict")
    for (const x of r.extra)
      lines.push(`extra          ${x.role}${x.name !== "" ? ` "${x.name}"` : ""}`);
  return `${lines.join("\n")}${lines.length > 0 ? "\n" : ""}fidelity ${(r.fidelity * 100).toFixed(1)}% (${r.matchedWeight}/${r.expectedWeight})\n`;
}
