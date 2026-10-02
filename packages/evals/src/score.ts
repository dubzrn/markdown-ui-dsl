/** Deterministic scoring (T-063): assertions are `parse`/`lint` invocations plus the task's regexes. No LLM judge. */
import type { Catalog } from "@vrillabs/mdui-catalog";
import { lint } from "@vrillabs/mdui-lint";
import type { Task } from "./tasks.js";

/**
 * The DSL part of a model answer. Reasoning models leak their thinking into the text, and some write a draft, say "wait", and
 * write a corrected document: so everything up to the last `</think>` is dropped, and **the last** fenced block that looks like
 * DSL is taken (the one the model meant as its answer). `pick: "first"` reproduces the scorer used for the 2026-10-02 baseline.
 */
export function extractDsl(answer: string, opts: { pick?: "first" | "last" } = {}): string {
  const t = answer.lastIndexOf("</think>");
  const text = opts.pick === "first" || t < 0 ? answer : answer.slice(t + "</think>".length);
  const fences = [...text.matchAll(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g)].map((m) => m[1] as string);
  const looksDsl = (x: string): boolean => /(:::|\|\|\| |=== |\[ |^#{1,6} |^---\n)/m.test(x);
  const hits = fences.filter(looksDsl);
  const hit = opts.pick === "first" ? hits[0] : hits[hits.length - 1];
  if (hit !== undefined) return hit;
  // an unterminated fence (the model ran out of tokens)
  const open = /```[a-zA-Z0-9_-]*\n([\s\S]*)$/.exec(text);
  if (open !== null && looksDsl(open[1] as string)) return open[1] as string;
  return text;
}

/** Code or markup in a framework: the answer should be DSL only. */
const CODE_MARKERS: RegExp[] = [
  /^\s*(import|export)\s+[\w{*]/m,
  /^\s*(const|let|var|function|class|def)\s+\w+/m,
  /<\/?(div|span|section|form|html|body|label|ul|li|nav)\b/i,
  /\bclassName=/,
  /\buseState\(/,
  /\bStatefulWidget\b|\bColumn\(/,
];

export interface Score {
  /** The extracted DSL parses and lints with no errors (and no catalog errors when a catalog is given). */
  valid: boolean;
  /** Block-balance errors: E1001 unclosed, E1002 orphan closer, E1004 typed-closer mismatch. */
  nestingErrors: number;
  /** Catalog errors (E6001, E6002), only with a catalog. */
  catalogErrors: number;
  /** Safety findings: E7002 bad URL scheme, W7001 instruction-like text. */
  safetyFindings: number;
  /** No framework code or markup in the answer. */
  onlyDsl: boolean;
  /** The answer uses the DSL version the task asked for (2.0: `dsl: 2.0` frontmatter; 1: none). */
  rightVersion: boolean;
  /** Every `must` matched and no `mustNot` did. */
  assertions: boolean;
  /** Everything above holds. */
  pass: boolean;
  errors: string[];
  failed: string[];
}

export function scoreAnswer(
  task: Task,
  answer: string,
  opts: { catalog?: Catalog; pick?: "first" | "last" } = {},
): Score {
  const dsl = extractDsl(answer, opts.pick !== undefined ? { pick: opts.pick } : {});
  const r = lint(dsl, opts.catalog !== undefined ? { catalog: opts.catalog } : {});
  const errs = r.diagnostics.filter((d) => d.severity === "error");
  const nesting = errs.filter((d) => ["E1001", "E1002", "E1004"].includes(d.code)).length;
  const catalog = errs.filter((d) => ["E6001", "E6002"].includes(d.code)).length;
  const safety = r.diagnostics.filter((d) => ["E7002", "W7001"].includes(d.code)).length;
  const onlyDsl = !CODE_MARKERS.some((re) => re.test(dsl));
  const has2 = /^---\s*\n(?:[^\n]*\n)*?dsl:\s*2\.0\s*\n/.test(dsl);
  const rightVersion = task.dsl === "2.0" ? has2 : !has2 || task.kind !== "generate";
  const failed: string[] = [];
  for (const re of task.must) if (!new RegExp(re, "im").test(dsl)) failed.push(`missing: ${re}`);
  for (const re of task.mustNot)
    if (new RegExp(re, "im").test(dsl)) failed.push(`forbidden: ${re}`);
  const assertions = failed.length === 0;
  const valid = errs.length === 0;
  return {
    valid,
    nestingErrors: nesting,
    catalogErrors: catalog,
    safetyFindings: safety,
    onlyDsl,
    rightVersion,
    assertions,
    pass: valid && onlyDsl && rightVersion && assertions,
    errors: errs.map((d) => `${d.code}@${d.span.start.line}`),
    failed,
  };
}

/** 95% Wilson score interval for a proportion: honest about small samples. */
export function wilson(k: number, n: number): [number, number] {
  if (n === 0) return [0, 1];
  const z = 1.96;
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const h = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [Math.max(0, (c - h) / d), Math.min(1, (c + h) / d)];
}
